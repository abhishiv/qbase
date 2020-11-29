.PHONY: project
project:
	make build

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
	./node_modules/.bin/tsc --resolveJsonModule -p ./tsconfig.json

.PHONY: doc-file
doc-file:
	./node_modules/.bin/docco -o . -x md -l plain  ${SRC_FILE}
	./node_modules/.bin/docco -o .  -l ../../tools/docco/theme/  ${SRC_FILE}


.PHONY: doc
doc:
	env SRC_FILE=./src/index.ts make doc-file
	env SRC_FILE=./src/relational.ts make doc-file
	mv ./src/index.md ./Readme.md
	mv ./src/index.html ./index.html
	./node_modules/.bin/typedoc --theme ../../tools/typedoc/default  --out ./docs/types   --includeDeclarations --exclude "**/node_modules/**/*" --inputFiles ./src


