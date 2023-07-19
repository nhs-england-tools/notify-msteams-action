// unit tests for the markdownhelper.ts module
import {expect, test} from '@jest/globals'
import {escapeMarkdown} from '../src/markdownhelper'
test('test escaping markdown', async () => {
    const testString = 'This is a test string'
    const escapedString = escapeMarkdown(testString)
    expect(escapedString).toBe(testString)
})
test('test escaping markdown with less than', async () => {
    const testString = 'This is a test < string'
    const escapedString = escapeMarkdown(testString)
    expect(escapedString).toBe('This is a test &lt; string')
})
test('test escaping markdown with greater than', async () => {
    const testString = 'This is a test > string'
    const escapedString = escapeMarkdown(testString)
    expect(escapedString).toBe('This is a test &gt; string')
})
test('test escaping markdown with ampersand', async () => {
    const testString = 'This is a test & string'
    const escapedString = escapeMarkdown(testString)
    expect(escapedString).toBe('This is a test &amp; string')
})
test('test escaping markdown with single quote', async () => {
    const testString = "This is a test ' string"
    const escapedString = escapeMarkdown(testString)
    expect(escapedString).toBe('This is a test &apos; string')
})
test('test escaping markdown with double quote', async () => {
    const testString = 'This is a test " string'
    const escapedString = escapeMarkdown(testString)
    expect(escapedString).toBe('This is a test &quot; string')
})