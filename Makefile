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

.PHONY: doc
doc:
	./node_modules/.bin/docco -o . -x md -l plain  ./src/index.ts
	rm -rf ./Readme.md
	mv ./src/index.md ./Readme.md
	./node_modules/.bin/docco -o .  -l parallel  ./src/index.ts
	mv ./src/index.html ./index.html
	./node_modules/.bin/typedoc --theme ../../tools/typedoc/default  --out ./docs/types   --includeDeclarations --exclude "**/node_modules/**/*" --inputFiles ./src


