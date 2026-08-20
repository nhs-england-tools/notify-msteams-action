#!/bin/bash

cat <<'EOF' >> "$HOME/.bashrc"
if [ -t 0 ]; then
  export GPG_TTY="$(tty)"
fi
EOF

# Setup dependencies
make config
