#!/usr/bin/env bash
# Source this file from a development launcher, then call
# promogest_ensure_dotnet10. It installs only into the current user's profile.

promogest_ensure_dotnet10() {
  local install_dir="${HOME:-}/.dotnet"
  local installed_version=""
  local installer_path=""
  local install_failed=false

  if [[ -z "${HOME:-}" ]]; then
    echo "ERROR: HOME is not set; cannot install the .NET 10 SDK for this user." >&2
    return 1
  fi

  export DOTNET_CLI_TELEMETRY_OPTOUT=1
  export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
  export DOTNET_NOLOGO=1

  if command -v dotnet >/dev/null 2>&1; then
    installed_version="$(dotnet --version 2>/dev/null || true)"
  fi

  if [[ "$installed_version" == 10.* ]]; then
    echo ".NET 10 SDK $installed_version is already available."
    return 0
  fi

  if [[ -x "$install_dir/dotnet" ]]; then
    installed_version="$("$install_dir/dotnet" --version 2>/dev/null || true)"
    if [[ "$installed_version" == 10.* ]]; then
      export DOTNET_ROOT="$install_dir"
      export PATH="$DOTNET_ROOT:$PATH"
      echo ".NET 10 SDK $installed_version found in $install_dir."
      return 0
    fi
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR: .NET 10 SDK is missing and curl is unavailable; cannot download Microsoft's installer." >&2
    return 1
  fi

  mkdir -p "$install_dir"
  installer_path="$(mktemp "${TMPDIR:-/tmp}/promogest-dotnet-install.XXXXXX.sh")"

  echo ".NET 10 SDK is missing. Downloading Microsoft's official installer and installing into $install_dir..."
  if ! curl --fail --location --silent --show-error --retry 3 --connect-timeout 20 --max-time 300 \
    "https://dot.net/v1/dotnet-install.sh" --output "$installer_path"; then
    rm -f "$installer_path"
    echo "ERROR: Could not download Microsoft's .NET installer. Check outbound HTTPS access to dot.net and try again." >&2
    return 1
  fi

  if ! bash "$installer_path" --channel 10.0 --install-dir "$install_dir" --no-path; then
    install_failed=true
  fi
  rm -f "$installer_path"

  if [[ "$install_failed" == true ]]; then
    echo "ERROR: Microsoft's installer could not install the .NET 10 SDK. Review the installer output and verify the preview container has enough disk space and required Linux dependencies." >&2
    return 1
  fi

  if [[ ! -x "$install_dir/dotnet" ]]; then
    echo "ERROR: .NET installer finished without producing $install_dir/dotnet." >&2
    return 1
  fi

  export DOTNET_ROOT="$install_dir"
  export PATH="$DOTNET_ROOT:$PATH"
  installed_version="$(dotnet --version 2>/dev/null || true)"
  if [[ "$installed_version" != 10.* ]]; then
    echo "ERROR: .NET installation completed, but the selected SDK is '$installed_version' instead of 10.x. Installed SDKs:" >&2
    dotnet --list-sdks >&2 || true
    return 1
  fi

  echo ".NET 10 SDK $installed_version is ready in $install_dir."
}
