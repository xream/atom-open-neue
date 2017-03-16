'use babel'

import { CompositeDisposable } from 'atom'
import _ from 'lodash'
import path from 'path'
import fs from 'fs'
import node from 'enhanced-resolve/lib/node'

export default {
  subscriptions: null,

  config: {
    resolveFile: {
      type: 'string',
      default: './atom-open-neue.js',
    },
    searchAllPanes: {
      type: 'boolean',
      default: true,
    },
    split: {
      type: ['boolean', 'string'],
      default: false,
      enum: [false, 'left', 'right', 'up', 'down'],
    },
    wordRegex: {
      type: 'string',
      default: '[-\\w\\/\\\\.\\:]+',
    },
    feelLucky: {
      type: 'boolean',
      default: true,
    },
  },

  activate(state) {
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'open-neue:toggle': () => this.toggle()
    }))
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  open(target) {
    atom.workspace.open(target, {
      searchAllPanes: atom.config.get('open-neue.searchAllPanes'),
      split: atom.config.get('open-neue.split'),
    })
  },

  getFileStats(file) {
    return fs.lstatSync(file)
  },

  isFile(file) {
    return this.getFileStats(file).isFile()
  },

  isDirectory(file) {
    return this.getFileStats(file).isDirectory()
  },

  fileExist(file) {
    return fs.existsSync(file)
  },

  getFileExt(file) {
    return path.basename(file, path.extname(file))
  },

  getFile(root, editorPath, file) {
    let filePath
    if (file.indexOf('/') === 0) {
      if (this.fileExist(filePath)) {
        return file
      } else {
        filePath = path.join(root, file.replace('/', ''))
      }
    } else {
      filePath = path.join(editorPath, '..', file)
    }
    if (this.fileExist(filePath)) {
      if (this.isFile(filePath)) {
        return filePath
      } else if (this.isDirectory(filePath)) {
        const relative = _.find(fs.readdirSync(filePath), i => this.getFileExt(i) === 'index')
        if (relative) {
          return path.join(filePath, relative)
        }
      }
    } else {
      const dir = path.dirname(filePath)
      if (!this.fileExist(dir) || !this.isDirectory(dir)) {
        return
      }
      const base = this.getFileExt(filePath)
      const relative = _.find(fs.readdirSync(dir), i => this.getFileExt(i) === base)
      if (relative) {
        return path.join(dir, relative)
      }
    }
  },

  toggle() {
    const editor = atom.workspace.getActiveTextEditor()
    const range = editor.getLastCursor().getCurrentWordBufferRange({
      wordRegex: new RegExp(atom.config.get('open-neue.wordRegex'))
    })
    const file = editor.getTextInBufferRange(range)
    if (!file) return
    const editorPath = editor.getPath()
    const root = _.find(atom.project.getPaths(), i => editorPath.includes(i))
    let target
    try {
      target = node.create.sync(require(path.join(root, atom.config.get('open-neue.resolveFile')))())(
        undefined,
        root,
        file,
      )
      this.open(target)
    } catch (err) {
      target = this.getFile(root, editorPath, file)
      if (target) {
        return this.open(target)
      }
      atom.packages.activatePackage('fuzzy-finder').then(pack => {
        const fuzzyFinder = pack.mainModule
        const projectView = fuzzyFinder.createProjectView()
        projectView.toggle()
        projectView.selectListView.refs.queryEditor.insertText(file.replace(/^(\.+?\/)+?/g, ''))
        if (!atom.config.get('open-neue.feelLucky')) return
        const wait = () => {
          if (projectView.element.textContent.includes('Project is empty')) {
            return
          } else if (projectView.element.querySelectorAll('li').length === 0) {
            setTimeout(wait, 100)
          } else {
            const editorPath = editor.getPath()
            const root = _.find(atom.project.getPaths(), i => editorPath.includes(i))
            const target = projectView.element.querySelectorAll('li')[0].querySelector('.path').textContent
            atom.commands.dispatch(projectView.element, 'core:cancel')
            this.open(path.join(root, target))
          }
        }
        setTimeout(wait, 100)
      })
    }
  }
}
