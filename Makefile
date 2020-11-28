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
	make typedoc

.PHONY: tsc
tsc:
	./node_modules/.bin/tsc --resolveJsonModule -p ./tsconfig.json

.PHONY: typedoc
typedoc:
	#./node_modules/.bin/typedoc --theme minimal  --out ./docs --ignoreCompilerErrors --excludeNotExported --includeDeclarations --exclude "**/node_modules/**/*" --inputFiles ./src/


