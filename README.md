# Radredis

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

## All

``` js
Post.all()
// => [ post, post, post, ...]

// All with limit and offset
Post.all({ limit: 2, offset: 10 })
// => [ post, post ]

// All by index
// NOT YET IMPLEMENTED
Post.all({ index: 'author_id', order: 'desc'} )
```

## Find
- Always returns an array

``` js
// Find one
Post.find(1)
// => [ { id: 1, title: 'A title', author_id: 1 } ]

// Find multiple
Post.find(1, 2, 3)
// => [ { id: 1, title: 'A title', author_id: 1 }, { id: 2, title: 'Another title', author_id: 2 } ]
```

## Create

``` js
Post.create({title: 'Redis rocks'})
// => { id: 1, title: 'Redis rocks' }

```

## Update

``` js
Post.update(1, { title: 'A new title'})
// => {id: 1, title: 'A new title'}
```

## Delete

``` js
Post.delete(1)
// => {id: 1, title: 'A new title'}
```

## Validation

*NOT IMPLEMENTED*

Validation is handled by json-schema (http://json-schema.org/examples.html)
Functions return promise rejections if bad data

## Indexing

*NOT IMPLEMENTED*

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


## Transforms

*Currently only `beforeSave` is implemented*

``` js
{
  beforeSave: (model) => { /*do stuff*/; return model}
}
```
