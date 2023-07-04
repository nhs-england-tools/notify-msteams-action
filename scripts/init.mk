# This file is part of the repository template project. Please, DO NOT edit this file.

nodejs-install: # Install Node.js
	if command -v asdf > /dev/null; then
		asdf plugin add nodejs ||:
		asdf install nodejs # SEE: .tool-versions
		asdf plugin add yarn ||:
		asdf install yarn latest
	fi

python-install: # Install Python
	if command -v asdf > /dev/null; then
		asdf plugin add python ||:
		asdf install python # SEE: .tool-versions
		asdf plugin add poetry ||:
		asdf install poetry latest
	fi

terraform-install: # Install Terraform
	if command -v asdf > /dev/null; then
		asdf plugin add terraform ||:
		asdf install terraform # SEE: .tool-versions
	fi

asdf-install: # Install asdf from https://asdf-vm.com/
	if [ -d "$$HOME/.asdf" ]; then
		(
			cd "$$HOME/.asdf"
			git pull
		)
	else
		git clone --depth=1 https://github.com/asdf-vm/asdf.git "$$HOME/.asdf" ||:
	fi
	asdf plugin update --all

githooks-install: # Install git hooks configured in this repository
	echo "./scripts/githooks/pre-commit" > .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit

clean:: # Remove all generated and temporary files
	rm -rf \
		docs/diagrams/.*.bkp \
		docs/diagrams/.*.dtmp \
		cve-scan*.json \
		sbom-spdx*.json

help: # List Makefile targets
	@awk 'BEGIN {FS = ":.*?# "} /^[ a-zA-Z0-9_-]+:.*? # / {printf "\033[36m%-41s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST) | sort

list-variables: # List all the variables available to make
	@$(foreach v, $(sort $(.VARIABLES)),
		$(if $(filter-out default automatic, $(origin $v)),
			$(if $(and $(patsubst %_PASSWORD,,$v), $(patsubst %_PASS,,$v), $(patsubst %_KEY,,$v), $(patsubst %_SECRET,,$v)),
				$(info $v=$($v) ($(value $v)) [$(flavor $v),$(origin $v)]),
				$(info $v=****** (******) [$(flavor $v),$(origin $v)])
			)
		)
	)

.DEFAULT_GOAL := help
.EXPORT_ALL_VARIABLES:
.NOTPARALLEL:
.ONESHELL:
.PHONY: *
MAKEFLAGS := --no-print-director
SHELL := /bin/bash
ifeq (true, $(shell [[ "$(VERBOSE)" =~ ^(true|yes|y|on|1|TRUE|YES|Y|ON)$$ ]] && echo true))
	.SHELLFLAGS := -cex
else
	.SHELLFLAGS := -ce
endif

.SILENT: \
	asdf-install \
	clean \
	githooks-install \
	nodejs-install \
	python-install \
	terraform-install
