/*
	Here are some example ways in which you can use node-fetch. Test each code fragment separately so that you don't get errors related to constant reassigning, etc.

	Top-level `await` support is required.
*/

import fetch from 'node-fetch';

// Plain text or HTML
const response = await fetch('https://github.com/');
const body = await response.text();

console.log(body);

// JSON
const response = await fetch('https://github.com/');
const json = await response.json();

console.log(json);

// Simple Post
const response = await fetch('https://httpbin.org/post', {method: 'POST', body: 'a=1'});
const json = await response.json();

console.log(json);

// Post with JSON
const body = {a: 1};

const response = await fetch('https://httpbin.org/post', {
	method: 'post',
	body: JSON.stringify(body),
	headers: {'Content-Type': 'application/json'}
});
const json = await response.json();

console.log(json);
