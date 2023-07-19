include ./scripts/init.mk

# This file contains hooks into the project configuration, test and build cycle
# as automated steps to be executed on a workstation and in the CI/CD pipeline.

install: # Install project dependencies
	npm install

build: # Build project
	npm run build
	npm run package

test: # Run tests
	npm test

config: # Configure development environment
	make \
		asdf-install \
		githooks-install \
		nodejs-install

.SILENT: \
	config \
	install \
	build \
	test
