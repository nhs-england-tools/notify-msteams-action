#!/bin/bash

# For GPG Commit signing
echo export GPG_TTY="$(tty)" | tee -a ~/.bashrc ~/.profile

# Setup dependencies
make config
