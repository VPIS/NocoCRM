// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  APP_ID,
  deploy,
  deploymentOutcomeMessage,
  parseEnvelope,
  runStudioCli,
  validateConfig,
  validateHealth,
  validateRelease,
} from '../../scripts/ci/deploy-studio.mjs';

// The release deployment to Studio (scripts/ci/deploy-studio.mjs, run by
// .github/workflows/deploy-studio.yml on a release tag), with the Studio CLI
// faked: what it checks before uploading, how it reads Studio's answers,
// and that it never lets the CLI's output, which may hold upload tickets,
// into an error.

const env = {
  NB_STUDIO_SERVER: 'https://studio.example.com/main',
  NB_STUDIO_API_KEY: 'test-key',
  STUDIO_APP_URL: 'https://studio.example.com/crm/',
  STUDIO_TARGET: 'linux-x64',
  STUDIO_NODE_MAJOR: '24',
  STUDIO_CLI: '/tmp/studio-cli/nb-studio',
};
const metadata = {
  repository: 'nocobase/nococrm',
  version: '1.0.0-beta.40',
  sha: 'a'.repeat(40),
  sha256: 'b'.repeat(64),
};

function scenario() {
  const release = {
    id: 'release-1',
    appId: APP_ID,
    sourceCommit: metadata.sha,
    checksum: metadata.sha256,
  };
  const uploaded = {
    superseded: false,
    release,
    deployed: {
      appId: APP_ID,
      releaseId: release.id,
      deployment: { id: 'deployment-1' } as { id: string } | null,
      request: null as { id: string; status: string; url?: string } | null,
    },
  };
  const deployment = {
    id: 'deployment-1',
    appId: APP_ID,
    releaseId: release.id,
    status: 'queued',
    release: { ...release },
  };
  const app = { app: { currentDeploymentId: deployment.id } };
  const cli = vi.fn(async (args: string[]) => {
    if (args[0] === 'deploy' && args[1] === '--app') return uploaded;
    if (args[0] === 'deploy' && args[1] === 'get') {
      // Queued once, then done.
      const answer = { ...deployment };
      deployment.status = 'succeeded';
      return answer;
    }
    if (args[0] === 'release') return release;
    if (args[0] === 'app') return app;
    throw new Error('Unexpected CLI command');
  });
  let time = 0;
  return {
    uploaded,
    deployment,
    app,
    options: {
      env,
      metadata,
      cli,
      health: vi.fn(async () => {}),
      summary: vi.fn(),
      now: () => time,
      wait: vi.fn(async (ms: number) => {
        time += ms;
      }),
    },
  };
}

describe('the Studio release deployment', () => {
  it('deploys only the release tag of the version package.json holds', () => {
    expect(() =>
      validateRelease(
        { GITHUB_REF: 'refs/tags/v1.0.0-beta.40' },
        '1.0.0-beta.40',
      ),
    ).not.toThrow();
    expect(() =>
      validateRelease({ GITHUB_REF: 'refs/heads/main' }, '1.0.0-beta.40'),
    ).toThrow('Deploy only from the release tag v1.0.0-beta.40');
    expect(() =>
      validateRelease(
        { GITHUB_REF: 'refs/tags/v1.0.0-beta.39' },
        '1.0.0-beta.40',
      ),
    ).toThrow('release tag');
    expect(() =>
      validateRelease({ GITHUB_REF: 'refs/tags/vnext' }, 'next'),
    ).toThrow('no release version');
  });

  it('refuses a configuration missing a setting or naming another platform', () => {
    expect(() => validateConfig(env)).not.toThrow();
    expect(() => validateConfig({ ...env, NB_STUDIO_API_KEY: ' ' })).toThrow(
      'Missing NB_STUDIO_API_KEY',
    );
    expect(() =>
      validateConfig({ ...env, STUDIO_TARGET: 'linux-arm64' }),
    ).toThrow('STUDIO_TARGET');
    expect(() =>
      validateConfig({
        ...env,
        STUDIO_APP_URL: 'http://studio.example.com/crm',
      }),
    ).toThrow('Invalid HTTPS base URL: STUDIO_APP_URL');
  });

  it('uploads the archive, waits for the deployment and checks the application runs it', async () => {
    const { options } = scenario();
    expect(await deploy(options)).toBe('succeeded');
    expect(options.cli).toHaveBeenNthCalledWith(1, [
      'deploy',
      '--app',
      'crm',
      '--repository',
      metadata.repository,
      '--sha',
      metadata.sha,
      '--file',
      'storage/exports/dist.tar.gz',
      '--json',
    ]);
    expect(options.wait).toHaveBeenCalledTimes(1);
    expect(options.health).toHaveBeenCalledWith(
      'https://studio.example.com/crm/api/healthz',
    );
    expect(deploymentOutcomeMessage('succeeded')).toContain('deployed');
  });

  it('stops at an approval Studio asks for, without claiming a deployment', async () => {
    const { options, uploaded } = scenario();
    uploaded.deployed.deployment = null;
    uploaded.deployed.request = {
      id: 'request-1',
      status: 'pending',
      url: '/admin/requests/request-1',
    };
    expect(await deploy(options)).toBe('pending');
    expect(options.summary).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://studio.example.com/admin/requests/request-1',
      ),
    );
    expect(options.health).not.toHaveBeenCalled();
    // An approval link to another site is refused.
    const other = scenario();
    other.uploaded.deployed.deployment = null;
    other.uploaded.deployed.request = {
      id: 'request-2',
      status: 'pending',
      url: 'https://evil.example.com/approve',
    };
    await expect(deploy(other.options)).rejects.toThrow(
      'Unexpected approval URL origin',
    );
  });

  it('fails when the deployment fails, or the application runs something else', async () => {
    const failed = scenario();
    failed.options.cli.mockImplementation(async (args: string[]) =>
      args[1] === '--app'
        ? failed.uploaded
        : { ...failed.deployment, status: 'failed' },
    );
    await expect(deploy(failed.options)).rejects.toThrow(
      'Deployment stopped (failed)',
    );
    const replaced = scenario();
    replaced.app.app.currentDeploymentId = 'deployment-2';
    await expect(deploy(replaced.options)).rejects.toThrow(
      'no longer runs this deployment',
    );
    const otherCommit = scenario();
    otherCommit.uploaded.release.sourceCommit = 'c'.repeat(40);
    await expect(deploy(otherCommit.options)).rejects.toThrow(
      'Uploaded commit mismatch',
    );
  });

  it('checks the health check is the CRM answering', () => {
    expect(() =>
      validateHealth({ ok: true, app: { name: 'crm', basePath: '/crm' } }),
    ).not.toThrow();
    expect(() => validateHealth({ ok: true, app: { name: 'main' } })).toThrow(
      'another app',
    );
  });

  it('keeps the CLI output out of its errors', () => {
    expect(() => parseEnvelope('ticket=secret')).toThrow(
      'Studio CLI returned invalid JSON',
    );
    const failing = () => {
      throw Object.assign(new Error('ticket=secret'), {
        status: 2,
        stdout: JSON.stringify({ error: { code: 'UPLOAD_FAILED' } }),
      });
    };
    let message = '';
    try {
      runStudioCli(
        env,
        ['deploy', '--app', 'crm', '--file', 'x'],
        failing as never,
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('UPLOAD_FAILED; exit=2');
    expect(message).toContain('Whether Studio received the upload is unknown');
    expect(message).not.toContain('secret');
  });

  it('runs on release tags, from main, in the studio environment', () => {
    const workflow = readFileSync(
      '.github/workflows/deploy-studio.yml',
      'utf8',
    );
    expect(workflow).toContain("tags: ['v*']");
    expect(workflow).not.toContain('branches:');
    expect(workflow).toContain('git merge-base --is-ancestor HEAD origin/main');
    expect(workflow).toContain('environment: studio');
  });
});
