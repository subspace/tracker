# Subspace Tracker Module

## External Usage

Install this module as a dependency into another project

```
$ yarn add 'https://www.github.com/subspace/tracker.git'
```

Require this module inside a script

```javascript
const tracker = require('subspace-tracker').default
const Storage = require('subspace-storage').default

const storage = new Storage()
tracker.open(storage)
```


## Development Usage

Clone and install the repo locally   

```
$ git clone https://www.github.com/subspace/module_name
$ cd module_name
$ yarn
```

Build manually.  
 
```
$ tsc -w
```

[Instructions](https://code.visualstudio.com/docs/languages/typescript#_step-2-run-the-typescript-build) to automate with visual studio code.

Run tests

```
$ npx jest
```

