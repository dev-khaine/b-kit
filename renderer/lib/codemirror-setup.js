import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';

export class CodeMirrorEditor {
  constructor(parent, options = {}) {
    this.parent = parent;
    this.options = options;
    this.view = null;
    this.onChangeCallback = null;
  }

  initialize(content = '', theme = 'light') {
    const extensions = [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && this.onChangeCallback) {
          this.onChangeCallback(this.getContent());
        }
      })
    ];

    if (theme === 'dark') {
      extensions.push(oneDark);
    }

    this.view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions
      }),
      parent: this.parent
    });
  }

  onChange(callback) {
    this.onChangeCallback = callback;
  }

  getContent() {
    return this.view ? this.view.state.doc.toString() : '';
  }

  setContent(content) {
    if (this.view) {
      this.view.dispatch({
        changes: {
          from: 0,
          to: this.view.state.doc.length,
          insert: content
        }
      });
    }
  }

  destroy() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  focus() {
    if (this.view) {
      this.view.focus();
    }
  }
}