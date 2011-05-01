(function() {

  ////////////////////////////////
  //TEST UTILS...
  ////////////////////////////////

  var HTML_MODE = 0;
  var CONSOLE_MODE = 1;

  var mode = HTML_MODE;

  var banner = document.getElementById('banner');
  var currentTestWidget;

  var testsPassed = 0;
  var totalTests = 0;

  window.console = window.console || {log:alert};

  function testException(testName, code, expectedError) {
      'use strict';
      startTest(testName);
      try {
          expectedError == SyntaxError ? eval(code) : code();
          finishTest(false);
      } catch (e) {
          (e instanceof expectedError) ? finishTest(true) : finishTest(false);
      }
  }

  function testValue(testName, fn, expectedValue, options) {
      'use strict';
      options = options || {};
      startTest(testName);
      (fn.apply(options.ctx, options.args) === expectedValue) ? finishTest(true) : finishTest(false);
  }

  function startTest(testName) {
    if (mode == CONSOLE_MODE) {
      console.log("testing..." + testName);
    } else {
      this.currentWidget = document.createElement('DIV');
      this.currentWidget.innerHTML = testName;
      document.body.appendChild(this.currentWidget);
    }
  }

  function finishTest(passed) {
    totalTests++;
    passed && testsPassed++;
    var result = passed ? "passed" : "failed";
    if (mode == CONSOLE_MODE) {
      console.log(result);
    } else {
      this.currentWidget.className = result;
    }
  }

  function startAll() {
    if (mode == HTML_MODE) {
      banner.innerHTML += [":", browser.browserName, browser.fullVersion].join(' ');
    }
  }

  function finishAll() {
    if (mode == HTML_MODE) {
      banner.innerHTML += ["","(", testsPassed, "out of", totalTests, "tests passed", ")"].join(' ');
    }
  }

  ////////////////////////////////
  //THE TESTS...
  ////////////////////////////////

  startAll();

  // A conforming implementation, when processing strict mode code, may not extend the
  //syntax of NumericLiteral (7.8.3) to include OctalIntegerLiteral as described in B.1.1.
  testException("no octal literals", '012', SyntaxError);

  // A conforming implementation, when processing strict mode code (see 10.1.1), may not
  //extend the syntax of EscapeSequence to include OctalEscapeSequence as described in B.1.2.
  testException("no octal escape sequence", '"\012"', SyntaxError);

  // Assignment to an undeclared identifier or otherwise unresolvable reference does not
  //create a property in the global object. When a simple assignment occurs within strict
  //mode code, its LeftHandSide must not evaluate to an unresolvable Reference. If it does
  //a ReferenceError exception is thrown (8.7.2).
  testException(
    "no implied globals",
    function () {'use strict'; x = 3;},
    ReferenceError
  );

  //The LeftHandSide also may not be a reference to a data property with the attribute
  //value {[[Writable]]:false}, to an accessor property with the attribute value
  //{[[Set]]:undefined}, nor to a non-existent property of an object whose [[Extensible]]
  //internal property has the value false. In these cases a TypeError exception is thrown
  //(11.13.1).
  var assignToNonWritable = function () {
      'use strict';
      var obj = {};
      Object.defineProperty(obj, "name", {
          writable: false
      });
      obj.name = "octopus";
  }

  testException("can't assign to non-writable properties", assignToNonWritable, TypeError);

  var assignWhenSetterUndefined = function () {
      'use strict';
      var obj = {};
      Object.defineProperty(obj, "name", {
          set: undefined
      });
      obj.name = "cuttlefish";
  }

  testException("can't assign when setter undefined", assignWhenSetterUndefined, TypeError);

  var assignToNonExtensible = function () {
      'use strict';
      var obj = {};
      Object.preventExtensions(obj);
      obj.name = "jellyfish";
  }

  testException("can't assign to non extensible", assignToNonExtensible, TypeError);

  //The identifier eval or arguments may not appear as the LeftHandSideExpression of an
  //Assignment operator (11.13) or of a PostfixExpression (11.13) or as the UnaryExpression
  //operated upon by a Prefix Increment (11.4.4) or a Prefix Decrement (11.4.5) operator.
  testException("can't assign to eval", "eval=3", SyntaxError);
  testException("can't assign to arguments", "arguments=3", SyntaxError);
  testException("can't postfix eval", "eval++", SyntaxError);
  testException("can't postfix arguments", "arguments++", SyntaxError);
  testException("can't prefix eval", "++eval", SyntaxError);
  testException("can't prefix arguments", "++arguments", SyntaxError);

  //Arguments objects for strict mode functions define non-configurable accessor properties
  //named "caller" and "callee" which throw a TypeError exception on access (10.6).
  testException(
    "can't use arguments.caller",
    function () {'use strict'; arguments.caller;},
    TypeError
  );

  testException(
    "can't use arguments.callee",
    function () {'use strict'; arguments.callee},
    TypeError
  );

  //Arguments objects for strict mode functions do not dynamically share their array indexed
  //property values with the corresponding formal parameter bindings of their functions. (10.6).
  var assignToArguments = function (x) {
    'use strict';
    arguments[0] = 3;
    return x;
  }

  testValue(
    "arguments not bound to formal params",
    assignToArguments,
    5,
    {args: [5]}
  );

  //For strict mode functions, if an arguments object is created the binding of the local
  //identifier arguments to the arguments object is immutable and hence may not be the
  //target of an assignment expression. (10.5).
  var assignToFormalParams = function (x) {
      'use strict';
      x = 3;
      return arguments[0];
  }

  testValue(
    "arguments object is immutable",
    assignToFormalParams,
    5,
    {args: [5]}
  );

  //It is a SyntaxError if strict mode code contains an ObjectLiteral with more than one
  //definition of any data property (11.1.5).
  testException("no duplicate properties", "({a:1, a:2})", SyntaxError);

  //It is a SyntaxError if the Identifier "eval" or the Identifier "arguments occurs as the
  //Identifier in a PropertySetParameterList of a PropertyAssignment that is contained in
  //strict code or if its FunctionBody is strict code (11.1.5).
  testException(
    "eval not allowed in propertySetParameterList",
    "({set a(eval){ }})",
    SyntaxError
  );

  testException(
    "arguments not allowed in propertySetParameterList",
    "({set a(arguments){ }})",
    SyntaxError
  );

  //Strict mode eval code cannot instantiate variables or functions in the variable environment
  //of the caller to eval. Instead, a new variable environment is created and that environment
  //is used for declaration binding instantiation for the eval code (10.4.2).
  testException(
    "eval cannot create var in calling context",
    function () {'use strict'; eval('var a = 99'); a},
    ReferenceError
  );

  //If this is evaluated within strict mode code, then the this value is not coerced to an object.
  //A this value of null or undefined is not converted to the global object and primitive values
  //are not converted to wrapper objects. The this value passed via a function call (including
  //calls made using Function.prototype.apply and Function.prototype.call) do not coerce the
  //passed this value to an object (10.4.3, 11.1.1, 15.3.4.3, 15.3.4.4).
  var getThis = function () {
      'use strict';
      return this;
  }

  testValue(
    "this is not coerced",
    getThis,
    4,
    {ctx: 4}
  );

  testValue(
    "no global coercion for null",
    getThis,
    4,
    {ctx: 4}
  );


  //When a delete operator occurs within strict mode code, a SyntaxError is thrown if its
  //UnaryExpression is a direct reference to a variable, function argument, or function name
  //(11.4.1).
  testException("can't delete variable directly", "var a = 3; delete a", SyntaxError);
  testException("can't delete argument", "function(a) {delete a}", SyntaxError);
  testException("can't delete function by name", "function fn() {}; delete fn", SyntaxError);

  //When a delete operator occurs within strict mode code, a TypeError is thrown if the
  //property to be deleted has the attribute { [[Configurable]]:false } (11.4.1).
  var deleteNonConfigurable = function () {
      'use strict';
      var obj = {};
      Object.defineProperty(obj, "name", {
          configurable: false
      });
      delete obj.name;
  }

  testException("error when deleting non configurable", deleteNonConfigurable, TypeError);

  //It is a SyntaxError if a VariableDeclaration or VariableDeclarationNoIn occurs within
  //strict code and its Identifier is eval or arguments (12.2.1).
  testException("can't use eval as var name", "var eval;", SyntaxError);
  testException("can't use arguments as var name", "var arguments;", SyntaxError);

  //Strict mode code may not include a WithStatement. The occurrence of a WithStatement
  //in such a context is an SyntaxError (12.10).
  testException("can't use with", "with (Math) {round(sqrt(56.67))}", SyntaxError);

  //It is a SyntaxError if a TryStatement with a Catch occurs within strict code and the
  //Identifier of the Catch production is eval or arguments (12.14.1)
  testException("can't use eval as catch id", "try {'cake'} catch(eval) {}", SyntaxError);
  testException("can't use arguments as catch id", "try {'cake'} catch(arguments) {}", SyntaxError);

  //It is a SyntaxError if the identifier eval or arguments appears within a
  //FormalParameterList of a strict mode FunctionDeclaration or FunctionExpression (13.1)
  testException("can't use eval as formal param", "function(eval) {}", SyntaxError);
  testException("can't use arguments as formal param", "function(arguments) {}", SyntaxError);

  //A strict mode function may not have two or more formal parameters that have the same
  //name. An attempt to create such a function using a FunctionDeclaration, FunctionExpression,
  //or Function constructor is a SyntaxError (13.1, 15.3.2).
  testException("can't duplicate formal params", "function(me, me, me) {}", SyntaxError);

  //An implementation may not associate special meanings within strict mode functions to
  //properties named caller or arguments of function instances. ECMAScript code may not
  //create or modify properties with these names on function objects that correspond to
  //strict mode functions (13.2).
  testException(
    "can't use caller obj of function",
    function () {'use strict'; (function () {}).caller},
    TypeError
  );

  //It is a SyntaxError to use within strict mode code the identifiers eval or arguments as
  //the Identifier of a FunctionDeclaration or FunctionExpression or as a formal parameter
  //name (13.1). Attempting to dynamically define such a strict mode function using the
  //Function constructor (15.3.2) will throw a SyntaxError exception.
  testException("can't use eval as function name", "function eval() {}", SyntaxError);
  testException("can't use arguments as function name", "function arguments() {}", SyntaxError);

  var functionConstructorStr = "new Function('eval', 'use strict')";
  testException("can't use eval as param name via constructor", functionConstructorStr, SyntaxError);

  finishAll();

})();
