# Welcome to Markdown Reader

This is a sample document to demonstrate the capabilities of the Markdown Reader application.

## Features Overview

The Markdown Reader supports **GitHub-Flavored Markdown** with additional professional features:

- Full CommonMark compliance
- Syntax-highlighted code blocks
- Automatic table of contents
- Live file watching
- Dark and light themes

### Code Highlighting

Here's an example of syntax-highlighted JavaScript:

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome to Markdown Reader`;
}

const user = "Developer";
greet(user);
```

And some Python code:

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate first 10 Fibonacci numbers
for i in range(10):
    print(fibonacci(i))
```

## Tables

| Feature | Supported | Notes |
|---------|-----------|-------|
| Headings | ✅ | H1 through H6 |
| Code Blocks | ✅ | With syntax highlighting |
| Tables | ✅ | Full GFM support |
| Task Lists | ✅ | Interactive checkboxes |
| Images | ✅ | Local and remote |

## Task Lists

- [x] Install dependencies
- [x] Build the application
- [x] Open a Markdown file
- [ ] Customize the theme
- [ ] Try drag-and-drop

## Blockquotes

> "Markdown is a lightweight markup language that you can use to add formatting elements to plaintext text documents."
>
> — **John Gruber**, Creator of Markdown

### Nested Lists

1. First item
   - Nested bullet
   - Another nested item
     - Even deeper nesting
2. Second item
   1. Numbered sub-item
   2. Another numbered sub-item
3. Third item

## Links and Emphasis

You can add [links](https://www.markdownguide.org) and emphasize text with *italic*, **bold**, or ***both***.

You can also ~~strikethrough~~ text.

## Horizontal Rule

---

## Images

![Markdown Logo](https://markdown-here.com/img/icon256.png)

## Inline Code

Use `const` or `let` for variable declarations in JavaScript. The `Array.prototype.map()` method is useful for transformations.

## Final Notes

This Markdown Reader is designed to be:

- **Fast** - Optimized rendering engine
- **Secure** - HTML sanitization built-in
- **Professional** - Clean, modern interface
- **Functional** - All essential Markdown features

Thank you for using Markdown Reader! 🎉