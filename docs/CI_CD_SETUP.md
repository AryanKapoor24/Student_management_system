# CI/CD setup: server and GitHub Secrets

This guide is everything you do **once** so that every push to `main` is
tested, built, pushed to ghcr.io and deployed automatically.

## What the pipeline needs

| Secret | Required | Value | Example |
|---|---|---|---|
| `SSH_HOST` | yes | Public IP address (or domain) of your server | `20.198.45.10` |
| `SSH_USER` | yes | Linux user the pipeline logs in as | `azureuser` / `ubuntu` |
| `SSH_PRIVATE_KEY` | yes | The **whole** private key file, including the `-----BEGIN…` and `-----END…` lines | *(multi-line text)* |
| `SSH_PORT` | no | SSH port, only if it is not 22 | `22` |
| `GITHUB_TOKEN` | — | **Do not create this.** GitHub provides it automatically to every run. It is used to push images to ghcr.io and to let the server pull them. | — |

The database password is **not** a GitHub secret. It lives only in
`~/sms/.env` on the server (step 4), so it never leaves the machine that uses it.

---

## Step 1: Get a Linux server

Any Ubuntu 22.04/24.04 VM with a public IP works (1 vCPU / 1 GB RAM is enough).
Free options for students:

- **Azure for Students**: free credit, no credit card. Create a "Virtual machine", image *Ubuntu Server 24.04*.
- **GitHub Student Developer Pack**: includes cloud credit (e.g. DigitalOcean).
- **AWS Free Tier**: EC2 `t2.micro` / `t3.micro`.

In the cloud provider's firewall / network security group, **allow inbound
ports 22 (SSH) and 80 (HTTP)**.

## Step 2: Install Docker on the server

SSH in with the login your cloud provider gave you, then run:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 curl
sudo usermod -aG docker $USER     # lets your user run docker without sudo
exit                              # log out and back in for the group to apply
```

Check it works after logging back in:

```bash
docker run --rm hello-world
docker compose version
```

## Step 3: Create a deploy SSH key (on your Windows PC)

The pipeline needs its own key. In **PowerShell**:

```powershell
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $HOME\.ssh\sms_deploy
```

Press **Enter twice** when asked for a passphrase (the pipeline cannot type
one). This creates two files:

- `sms_deploy`: the **private** key, which goes into the GitHub secret
- `sms_deploy.pub`: the **public** key, which goes onto the server

Copy the public key to the server (replace user and IP):

```powershell
type $HOME\.ssh\sms_deploy.pub | ssh azureuser@20.198.45.10 "cat >> ~/.ssh/authorized_keys"
```

Test that the new key works. This must print a table without asking for a password:

```powershell
ssh -i $HOME\.ssh\sms_deploy azureuser@20.198.45.10 docker ps
```

## Step 4: Create the app's `.env` on the server

```bash
mkdir -p ~/sms
openssl rand -hex 24              # prints a strong random password; copy it
nano ~/sms/.env
```

Put this in the file (paste your generated password):

```
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=<paste-the-random-password>
POSTGRES_DB=sms_db
HTTP_PORT=80
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`. The deploy script adds
`BACKEND_IMAGE`, `FRONTEND_IMAGE` and `IMAGE_TAG` to this file by itself.

## Step 5: Add the secrets to GitHub

1. Open your repository on GitHub, then go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** for each one:
   - Name `SSH_HOST`, value: your server IP
   - Name `SSH_USER`, value: your server username
   - Name `SSH_PRIVATE_KEY`, value: the private key. To copy it in PowerShell:
     ```powershell
     Get-Content $HOME\.ssh\sms_deploy -Raw | Set-Clipboard
     ```
     then paste into the value box. It must include the BEGIN and END lines.
3. Only if your SSH port is not 22, also add `SSH_PORT`.

Secret values are encrypted. GitHub shows them as `***` in logs and nobody
can read them back, not even you.

## Step 6: Run the pipeline

Push any commit to `main` (or open the **Actions** tab, then **CI/CD**, then **Run workflow**).
Watch the jobs: `lint` and `test` run in parallel, then `build-and-push`
(×2), then `deploy`. When it is green, open `http://<SSH_HOST>/`.

After the first run, the images appear under your GitHub profile, in **Packages**:
`sms-backend` and `sms-frontend`, each tagged with the commit SHA and `latest`.

## Step 7 (recommended): Protect the `main` branch

This makes GitHub refuse to merge a pull request whose checks fail,
which is useful for the demo.

**Settings → Branches → Add branch ruleset** (or *Add classic branch protection rule*):

- Target branch: `main`
- Enable **Require status checks to pass**, and add `Lint (ruff + ESLint)` and
  `Test (pytest + coverage)` (they appear in the list after the pipeline has run once)
- Enable **Require a pull request before merging**

---

## How the deploy and rollback work

The `deploy` job:

1. Writes the private key to the runner and adds the server's host key to `known_hosts`.
2. Copies `docker-compose.yml` and `scripts/deploy.sh` to `~/sms/` on the server.
3. Logs the server in to ghcr.io with the temporary `GITHUB_TOKEN`, sent via stdin.
4. Runs `deploy.sh <commit-sha>` on the server, which:
   - reads the currently running tag (`IMAGE_TAG` in `.env`), the **rollback target**
   - pulls the new images and runs `docker compose up -d`
   - curls `http://localhost/api/health` up to 12 times (5 s apart)
   - **healthy**: done, exit 0 (green)
   - **unhealthy**: restarts the previous tag, checks health again, exits 1 (red)
5. Logs the server out of ghcr.io, even if the deploy failed.

Rollback is fast because the previous images are still on the server; nothing
has to be rebuilt.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Secret SSH_HOST is not set` | Add the secrets (step 5). Names are case-sensitive. |
| `Permission denied (publickey)` | The public key is not in the server's `~/.ssh/authorized_keys`, or `SSH_PRIVATE_KEY` is missing its BEGIN/END lines. |
| `ssh: connect to host … port 22: Connection timed out` | Port 22 is closed in the cloud firewall. |
| `permission denied … docker.sock` | Run `sudo usermod -aG docker $USER` on the server and log in again. |
| `.env not found` | Create `~/sms/.env` on the server (step 4). |
| Site does not open but deploy is green | Port 80 is closed in the cloud firewall. |
| Backend unhealthy after changing `POSTGRES_PASSWORD` | Postgres keeps the password from its first start. On the server run `cd ~/sms && docker compose down -v` (this **deletes the data**), then redeploy. |
