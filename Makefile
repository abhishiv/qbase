.PHONY: project
project:
	make build
	make doc

.PHONY: install
install:
	yarn install --prefer-offline

.PHONY: test
test:
	./node_modules/.bin/jest --runInBand

.PHONY: build
build:
	make tsc
	make doc

.PHONY: tsc
tsc:
	./node_modules/.bin/tsc --resolveJsonModule -p ./tsconfig.json --outDir ./dist/esm
	./node_modules/.bin/tsc --resolveJsonModule -p ./tsconfig.json --module commonjs --outDir ./dist/cjs

.PHONY: doc-file
doc-file:
	./node_modules/.bin/docco -o . -x md -l plain  ${SRC_FILE}
	./node_modules/.bin/docco -o .  -l ./node_modules/@gratico/docs-site/src/themes/docco/theme/  ${SRC_FILE}

.PHONY: doc
doc:
	mkdir -p docs
	cp -r src docs
	env SRC_FILE=./docs/index.ts make doc-file
	env SRC_FILE=./docs/relational.ts make doc-file
	env SRC_FILE=./docs/utils.ts make doc-file
	env SRC_FILE=./docs/schema.ts make doc-file
	env SRC_FILE=./docs/types.ts make doc-file
	env SRC_FILE=./docs/watch.ts make doc-file
	./node_modules/.bin/typedoc --theme ./node_modules/@gratico/docs-site/src/themes/typedoc/default  --out ./docs/types   --includeDeclarations --exclude "**/node_modules/**/*" --inputFiles ./src


