#!/usr/bin/env bash
set -euo pipefail

revision="${1:?revision is required}"
root="/www/wwwroot/vvv-front-end"
stage="/tmp/v1rtual-frontend-${revision}"
release="${root}/releases/${revision}"

case "$revision" in
  *[!A-Za-z0-9._-]*|'') echo "invalid revision" >&2; exit 2 ;;
esac

test -f "${stage}/index.html"
test ! -e "$release"
install -d -o www -g www -m 0755 "${root}/releases"
install -d -o www -g www -m 0755 "$release"
cp -a "${stage}/." "$release/"
chown -R www:www "$release"
rm -rf "$stage"

ln -s "releases/${revision}" "${root}/current.next"
mv -Tf "${root}/current.next" "${root}/current"
/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
current="$(readlink -f "${root}/current")"
find "${root}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +4 | cut -d' ' -f2- | while IFS= read -r old_release; do
  test "$old_release" = "$current" || rm -rf "$old_release"
done
