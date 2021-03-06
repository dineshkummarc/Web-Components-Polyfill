module('Declaration', {
    setup: function() {
        this.actualEval = window.eval;
        window.eval = function(code) {
            this.codeEvaluated = code;
        }.bind(this);
        this.actualHTMLElementElement = polyfill.HTMLElementElement;
        polyfill.HTMLElementElement = function(name, tagName, declaration) {
            this.name = name;
            this.extends = tagName;
            this.declaration = declaration;
        }
    },
    teardown: function() {
        polyfill.HTMLElementElement = this.actualHTMLElementElement;
        window.eval = this.actualEval;
    }
});

test('.generateConstructor must create a swizzled-prototype, HTMLElement-derived object', function() {
    var mockElement = function() {}
    var count = 0;
    var result = new (polyfill.Declaration.prototype.generateConstructor.call({
        element: {
            extends: 'div'
        },
        created: function() {
            count = 0;
        },
        elementPrototype: mockElement.prototype
    }));
    equal(result.__proto__.constructor, mockElement);
    equal(result.__proto__.__proto__.constructor, HTMLDivElement);
});

test('.evalScript must attempt to evaluate script, wrapped in a shim', function() {
    polyfill.Declaration.prototype.evalScript.call({}, {
        textContent: 'foo'
    });
    equal(this.codeEvaluated, '(function(){\nfoo\n}).call(this.element);');
});

test('.addTemplate must set the this.template value', function() {
    var mockDeclaration = {};
    polyfill.Declaration.prototype.addTemplate.call(mockDeclaration, 'foo');
    equal(mockDeclaration.template, 'foo');
});

test('.morph must swizzle prototype of an existing object', 4, function() {
    var mockElementPrototype = document.createElement('div');
    var element = {};
    var shadowRootCreated = false;
    polyfill.Declaration.prototype.morph.call({
        element: {
            generatedConstructor: function() {},
            extends: 'div'
        },
        createShadowRoot: function(e) {
            equal(e.tagName, 'DIV');
            strictEqual(e, element);
            return 'foo';
        },
        created: function(shadowRoot) {
            strictEqual(this, element);
            equal(shadowRoot, 'foo');
        }
    }, element);
});

test('.createShadowRoot must exit early if there is no this.template', function() {
    var result = polyfill.Declaration.prototype.createShadowRoot.call({});
    ok(!result);
});

test('.createShadowRoot must create a WebKitShadowRoot instance', function() {
    var host = document.createElement('div');
    var result = polyfill.Declaration.prototype.createShadowRoot.call({
        template: { childNodes: [] }
    }, host);
    equal(result.__proto__.constructor, WebKitShadowRoot);
    deepEqual(Object.keys(result), [ 'nextSibling', 'childNodes', 'nodeType', 'host', 'prefix', 'parentElement', 'nodeName',
        'activeElement', 'textContent', 'namespaceURI', 'firstChild', 'innerHTML', 'localName', 'lastChild', 'baseURI',
        'previousSibling', 'ownerDocument', 'nodeValue', 'parentNode', 'attributes' ]);
});

test('.createShadowRoot must clone template child nodes into the newly created WebKitShadowRoot instance', function() {
    var host = document.createElement('div');
    var span = host.appendChild(document.createElement('span'));
    var b = host.appendChild(document.createElement('b'));
    equal(host.childNodes.length, 2);
    var result = polyfill.Declaration.prototype.createShadowRoot.call({
        template: { childNodes: [ span, b ] }
    }, host);
    equal(result.firstChild.tagName, 'SPAN');
    equal(result.lastChild.tagName, 'B');
    equal(host.childNodes.length, 2);
});

test('.prototypeFromTagName must return correct HTML element prototype', function() {
    equal(polyfill.Declaration.prototype.prototypeFromTagName.call({}, 'div').constructor, HTMLDivElement);
    equal(polyfill.Declaration.prototype.prototypeFromTagName.call({}, 'span').constructor, HTMLSpanElement);
    equal(polyfill.Declaration.prototype.prototypeFromTagName.call({}, 'table').constructor, HTMLTableElement);
});

test('constructor must correctly initialize instance members', function() {
    var declaration = new polyfill.Declaration('scones', 'div');
    equal(declaration.elementPrototype.constructor, HTMLDivElement);
    equal(declaration.element.name, 'scones');
    equal(declaration.element.extends, 'div');
    strictEqual(declaration.element.declaration, declaration);
    ok(!!declaration.element.generatedConstructor);
});
