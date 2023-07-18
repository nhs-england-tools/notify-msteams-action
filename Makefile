include ./scripts/init.mk

# This file contains hooks into the project configuration, test and build cycle
# as automated steps to be executed on a workstation and in the CI/CD pipeline.

config: # Configure development environment
	make \
		nodejs-install

.SILENT: \
	config

install: # Install project dependencies
	npm install

build:
	npm run build && npm run package

test: # Run tests
	npm test
