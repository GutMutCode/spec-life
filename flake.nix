{
  description = "Task Priority Manager - Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js 환경
            nodejs_20
            pnpm

            # 데이터베이스
            postgresql_16

            # 빌드 도구 (bcrypt 등 네이티브 모듈을 위해)
            python3
            gcc
            gnumake

            # 개발 도구
            git

            # Playwright 브라우저 의존성
            chromium
          ];

          shellHook = ''
            echo "Task Priority Manager 개발 환경"
            echo "================================"
            echo "Node.js: $(node --version)"
            echo "pnpm: $(pnpm --version)"
            echo "PostgreSQL: $(postgres --version | head -n 1)"
            echo ""
            echo "사용 가능한 명령:"
            echo "  pnpm install    - 의존성 설치"
            echo "  pnpm dev        - 개발 서버 시작"
            echo "  pnpm build      - 프로젝트 빌드"
            echo "  pnpm test       - 테스트 실행"
            echo ""
            echo "PostgreSQL 시작:"
            echo "  initdb -D .postgres"
            echo "  pg_ctl -D .postgres -l logfile start"
            echo "  createdb task_priority_dev"
            echo ""

            # pnpm 스토어 경로 설정
            export PNPM_HOME="$PWD/.pnpm"
            export PATH="$PNPM_HOME:$PATH"

            # Playwright 브라우저 설정
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

            # PostgreSQL 환경 변수
            export PGDATA="$PWD/.postgres"
            export PGHOST="localhost"
            export PGPORT="5432"
            export PGDATABASE="task_priority_dev"
          '';
        };
      }
    );
}
