# Radredis

[![Build Status](https://travis-ci.org/bustlelabs/radredis.svg?branch=master)](https://travis-ci.org/bustlelabs/radredis)

Radredis is a node data adapter for redis.
It is not a full ORM but a simple opinionated interface for storing application data in redis.  

## Goals

- Use json-schema for data validation
- No classes. No `new` keyword. Factory functions.
- Before/After transforms
- Promise based
- Pipelining. All redis commands are executed via transaction if possible.
- iodredis under the hood.

## Setup

``` js
const Radredis = require('radredis')
const redisOpts = { db: 15, keyPrefix: 'your-app:' }
const transforms = { beforeSave: (model) => model.title = model.title.toLowerCase() }
const schema = {  
  title: 'Post',
  type: "object"
  properties : {
    title: {
      type: 'string'
    },
    author_id: {
      type: 'number'
    }
  }
}

const Post = Radredis(schema, transforms, redisOpts)
```

## Redis configuration

The final three arguments to `Radredis` are passed through to `ioredis`. See their documentation for more info: https://github.com/luin/ioredis/blob/master/API.md#new_Redis_new

Examples:

``` js
// Radredis(schema, transforms, [port], [host], [options])
const Post = Radredis(schema, transforms, {db: 15})
const Post = Radredis(schema, transforms, 6379, 'localhost', {db: 15})
const Post = Radredis(schema, transforms, 'redis://user:password@localhost:6379/15')
```

## All

``` js
Post.all()
// => [ post, post, post, ...]

// All with limit and offset
Post.all({ limit: 2, offset: 10 })
// => [ post, post ]

// All by index
// Note order is currently always descending
Post.all({ index: 'author_id' } )

// Return only certain properties
Post.all({ properties: ['author_id'] } )
```

## Range

Allows for retrieving records by range of values for an attribute.
- Results ordered in descending value
- Results are inclusive of `min` and `max`
- `min`, `max`, and `index` are required

``` js
Post.range({ index: 'author_id', min: 1, max: 2})
// => [ post, post, post, ...]

// Also accepts limit and offset
Post.range({ index: 'author_id', min: 1, max: 2, limit: 2, offset: 10 })
// => [ post, post ]

// Return only certain properties
Post.range({ index: 'author_id', min: 1, max: 2, properties: ['author_id'] })
```

## Scan

``` js
const stream = Post.scan()
stream.on('data', (post) => { console.log(post) })
stream.on('end', () => { console.log( 'Read all posts!') }

// => { id: 1, title: 'A title', author_id: 1 },
// => { id: 2, title: 'Another title', author_id: 2 }
// ...
// => Read all posts!

// You can scan only a specific index by passing the index name to scan
const stream = Post.scan('published_at')
stream.on('data', (post) => { console.log(post) })
stream.on('end', () => { console.log( 'Read only published posts!') }

// => { id: 1, title: 'A title', author_id: 1 },
// => { id: 2, title: 'Another title', author_id: 2 }
// ...
// => Read only published posts!
```

``` js
// Return only specific fields
const stream = Post.scan('published_at', ['author_id'])
stream.on('data', (post) => { console.log(post) })

// => { id: 1, author_id: 1 },
// => { id: 2, author_id: 2 }
// ...
```


## Find


``` js
// Find one
Post.find(1)
// => { id: 1, title: 'A title', author_id: 1 }

// Find multiple
Post.find([1, 2, 3])
// => [ { id: 1, title: 'A title', author_id: 1 }, { id: 2, title: 'Another title', author_id: 2 } ]
```

## Create

``` js
Post.create({title: 'Redis rocks'})
// => { id: 1, title: 'Redis rocks' }

```

## Update

Does a partial update of the model. Basically Object.assign(old, new)

``` js
Post.create(1, { author: 5 })
Post.replace(1, { title: 'A new title'})
// => {id: 1, title: 'A new title', author: 5 }
```

## Replace

Completely replaces the model in the database with the provided attributes

``` js
Post.create(1, { author: 5 })
Post.replace(1, { title: 'A new title'})
// => {id: 1, title: 'A new title'}
```

## Delete

``` js
Post.delete(1)
// => {id: 1, title: 'A new title'}
```

## Versions

See versioning below. Will return all versions of an object including the most recent one.

``` js
Post.create({ title: 'foo'})
Post.update(1, { title: 'bar'})
// => [ {id: 1, _v: 1, title: 'foo'}, {id: 1, _v: 2, title: 'bar'} ]
```

## Validation

*NOT IMPLEMENTED*

Validation is handled by json-schema (http://json-schema.org/examples.html)
Functions return promise rejections if bad data

## Indexing

Specify indexed attributes inside json schema:
``` js
const schema = {  
  title: 'Post',
  type: "object"
  properties : {
    author_id: {
      type: 'number',
      index: true
    }
  }
}
```

## Versioning

Specify attributes that should create a new version when changed inside json schema. The version number is in the `_v` key of the record
``` js
const schema = {  
  title: 'Post',
  type: "object"
  properties : {
    author_id: {
      type: 'number',
      index: true
    },
    title: {
      type: 'string'
      version: true
    }
  }
}
```


## Transforms


``` js

// Note oldAttributes will be undefined on create
{
  beforeSave: (oldModel, newModel) => { /*do stuff to attributes*/},
  afterSave: (savedModel) => { /*do stuff with attributes*/}
}
```

## Errors

radredis will throw a `RecordNotFound` error on any operation where the record does not exist.

``` js

import radredis from 'radredis'

// Can also do:
//import { default as radredis, RecordNotFound } from 'radredis'

const Post = radredis(schema, transforms, redisOpts)

Post.find(999).catch(radredis.RecordNotFound, (err) => console.log(err) )

```
