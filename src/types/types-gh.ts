// Базовые общие типы
interface GitHubUser {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    type: string;
    site_admin: boolean;
  }
  
  interface GitHubRepository {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: GitHubUser;
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    clone_url: string;
    ssh_url: string;
    default_branch: string;
    stargazers_count: number;
    watchers_count: number;
    forks_count: number;
    language: string | null;
    visibility: 'public' | 'private' | 'internal';
  }
  
  interface GitHubOrganization {
    login: string;
    id: number;
    node_id: string;
    url: string;
    avatar_url: string;
    description: string | null;
  }
  
  // ─── push ───────────────────────────────────────────
  interface PushEvent {
    ref: string;           // "refs/heads/main"
    before: string;        // sha
    after: string;         // sha
    commits: {
      id: string;
      message: string;
      timestamp: string;
      url: string;
      author: { name: string; email: string; username: string };
      committer: { name: string; email: string; username: string };
      added: string[];
      removed: string[];
      modified: string[];
    }[];
    head_commit: PushEvent['commits'][number] | null;
    forced: boolean;
    compare: string;
    pusher: { name: string; email: string };
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── pull_request ────────────────────────────────────
  interface PullRequestEvent {
    action:
      | 'opened' | 'closed' | 'reopened' | 'synchronize'
      | 'edited'  | 'assigned' | 'unassigned'
      | 'review_requested' | 'review_request_removed'
      | 'labeled' | 'unlabeled' | 'locked' | 'unlocked';
    number: number;
    pull_request: {
      id: number;
      node_id: string;
      url: string;
      html_url: string;
      number: number;
      state: 'open' | 'closed';
      title: string;
      body: string | null;
      draft: boolean;
      merged: boolean;
      merged_at: string | null;
      merge_commit_sha: string | null;
      user: GitHubUser;
      head: { ref: string; sha: string; repo: GitHubRepository };
      base: { ref: string; sha: string; repo: GitHubRepository };
      created_at: string;
      updated_at: string;
      closed_at: string | null;
      labels: { id: number; name: string; color: string }[];
      assignees: GitHubUser[];
      requested_reviewers: GitHubUser[];
      commits: number;
      additions: number;
      deletions: number;
      changed_files: number;
    };
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── deployment ──────────────────────────────────────
  interface DeploymentEvent {
    action: 'created';
    deployment: {
      url: string;
      id: number;
      node_id: string;
      sha: string;
      ref: string;
      task: string;
      environment: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      statuses_url: string;
      repository_url: string;
      creator: GitHubUser;
      payload: Record<string, unknown>;
    };
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── fork ────────────────────────────────────────────
  interface ForkEvent {
    forkee: GitHubRepository & { parent: GitHubRepository };
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── release ─────────────────────────────────────────
  interface ReleaseEvent {
    action: 'published' | 'unpublished' | 'created' | 'edited' | 'deleted' | 'prereleased' | 'released';
    release: {
      id: number;
      node_id: string;
      tag_name: string;
      target_commitish: string;
      name: string | null;
      body: string | null;
      draft: boolean;
      prerelease: boolean;
      created_at: string;
      published_at: string | null;
      url: string;
      html_url: string;
      tarball_url: string;
      zipball_url: string;
      author: GitHubUser;
      assets: {
        id: number;
        name: string;
        size: number;
        download_count: number;
        browser_download_url: string;
        content_type: string;
        state: string;
        created_at: string;
        updated_at: string;
      }[];
    };
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── repository ──────────────────────────────────────
  interface RepositoryEvent {
    action:
      | 'created' | 'deleted' | 'archived' | 'unarchived'
      | 'publicized' | 'privatized' | 'renamed' | 'transferred' | 'edited';
    repository: GitHubRepository;
    sender: GitHubUser;
    organization?: GitHubOrganization;
  }
  
  // ─── star ────────────────────────────────────────────
  interface StarEvent {
    action: 'created' | 'deleted';
    starred_at: string | null;
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── page_build ──────────────────────────────────────
  interface PageBuildEvent {
    id: number;
    build: {
      url: string;
      status: 'built' | 'errored' | 'building' | 'null';
      error: { message: string | null };
      pusher: GitHubUser;
      commit: string;
      duration: number;
      created_at: string;
      updated_at: string;
    };
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── package ─────────────────────────────────────────
  interface PackageEvent {
    action: 'published' | 'updated';
    package: {
      id: number;
      name: string;
      namespace: string;
      description: string | null;
      ecosystem: string;
      package_type: string;
      html_url: string;
      created_at: string;
      updated_at: string;
      owner: GitHubUser;
      package_version: {
        id: number;
        version: string;
        name: string;
        description: string | null;
        body: string | null;
        body_html: string | null;
        release: Record<string, unknown> | null;
        manifest: string;
        html_url: string;
        tag_name: string | null;
        source_url: string | null;
        draft: boolean;
        prerelease: boolean;
        created_at: string;
        updated_at: string;
        metadata: unknown[];
        container_metadata: Record<string, unknown> | null;
        npm_metadata: Record<string, unknown> | null;
        nuget_metadata: Record<string, unknown> | null;
        rubygems_metadata: unknown[];
        package_files: { download_url: string; id: number; name: string; sha256: string; sha1: string; md5: string; content_type: string; state: string; size: number }[];
        author: GitHubUser;
        installation_command: string;
      };
      registry: { about_url: string; name: string; type: string; url: string; vendor: string } | null;
    };
    sender: GitHubUser;
    repository: GitHubRepository;
    organization?: GitHubOrganization;
  }
  
  // ─── Union всех событий ──────────────────────────────
  export type GitHubWebhookEvent =
    | ({ event: 'push' }         & PushEvent)
    | ({ event: 'pull_request' } & PullRequestEvent)
    | ({ event: 'deployment' }   & DeploymentEvent)
    | ({ event: 'fork' }         & ForkEvent)
    | ({ event: 'release' }      & ReleaseEvent)
    | ({ event: 'repository' }   & RepositoryEvent)
    | ({ event: 'star' }         & StarEvent)
    | ({ event: 'page_build' }   & PageBuildEvent)
    | ({ event: 'package' }      & PackageEvent);
  
  // Экспорт всех типов по отдельности
  export type {
    PushEvent, PullRequestEvent, DeploymentEvent,
    ForkEvent, ReleaseEvent, RepositoryEvent,
    StarEvent, PageBuildEvent, PackageEvent,
    GitHubUser, GitHubRepository, GitHubOrganization,
  };