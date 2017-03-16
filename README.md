# atom-open-neue package

open file under cursor with enhanced-resolve, path resolve and fuzzy-finder

## config

Create `atom-open-neue.js` in the project root. You can change the file path in settings.

Example:

```javascript
module.exports = () => ({
  extensions: ['.js', '.vue', '.json'],
  modules: [
    '/Users/xream/Project/test/src',
    '/Users/xream/Project/test/node_modules',
  ],
  alias: {
    src: '/Users/xream/Project/test/src',
  },
})
```
