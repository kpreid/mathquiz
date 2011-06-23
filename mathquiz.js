/* 
  Copyright 2011 Kevin Reid, under the terms of the MIT X license
  found at <http://www.opensource.org/licenses/mit-license.html>.
*/

function initMathQuiz(container, scoreE, averageE) {
  // --- Code setup ---
  var $ = jQuery;
  MathJax.Hub.Config({
    showProcessingMessages: false
  });
  
  // --- Document DOM setup ---
  var sample = $(container).children("*").first();
  //console.log(sample);
  sample.remove();

  function makeNumberWidget(element, places) {
    var jelem = $(element);
    var value = 0;
    var o = {
      set: function (nv) {
        value = nv;
        jelem.text(isNaN(nv) ? "—" : nv.toFixed(places));
      },
      add: function (delta) {
        o.set(value + delta);
      },
      get: function () {
        return value;
        jelem.text(nv.toFixed(places));
      }
    };
    o.add(0);
    return o;
  }
  var scoreN = makeNumberWidget(scoreE, 2);
  var averageN = makeNumberWidget(averageE, 2);
  
  // --- Settings ---
  var choices = 4;
  
  // --- State ---
  var questions = 0;
  var problemSet;
  var active = true;
  var wrongsLeft = 0;
  
  // --- Functions ---
  
  function randInt(start, limit) {
    return start + Math.floor(Math.random()*(limit-start));
  }
  
  function pickRandomProperty(obj) {
    // From http://stackoverflow.com/questions/2532218/pick-random-property-from-a-javascript-object/2532251#2532251
    var result;
    var count = 0;
    for (var prop in obj)
      if (Object.hasOwnProperty.call(obj, prop))
        if (Math.random() < 1/++count)
           result = prop;
    return result;
  }
  
  function genProduct(factors) {
    if (factors.length <= 0) {
      return "1";
    }
    var res = "1";
    for (var i = 0; i < factors.length; i++) {
      if (factors[i] == "1") {
        // noop
      } else if (factors[i] == "0") {
        return "0"
      } else if (res == "1") {
        res = factors[i];
      } else if (!/\d$/.test(res) || !/^\d/.test(factors[i])) {
        res = res + factors[i];
      } else {
        res = res + " · " + factors[i];
      }
    }
    return res;
  }
  function genExp(base, exponent) {
    if (exponent == "1") {
      return base;
    } else if (exponent == "0") {
      return "1";
    } else {
      return base + "^{" + exponent + "}";
    }
  }
  
  function clearChoices() {
    while (container.childNodes.length > 0)
      container.removeChild(container.firstChild);
  }

  function updateScore() {
    averageN.set((scoreN.get() / questions));
    $(averageE).text(averageE.innerHTML + "/" + Math.log(choices)/Math.log(2));
  }
    
  function appendChoice(text, className) {
    var node = sample.clone();
    node.addClass(className);
    var button = node.find("button");
    button.text("\\(" + text + "\\)");
    var choiceClicked = false; // ensure no double counting
    button.click(function (event) {
      if (!active || choiceClicked) return;
      choiceClicked = true;
      //console.log(text);
      if (className == "incorrect") {
        // user correctly chose the incorrect item
        scoreN.add(Math.log(wrongsLeft+1)/Math.log(2));
        questions++;
        
        node.css('background-color', "#0F0");
        $(container).fadeOut(200, function () {
          newProblems();
          $(container).fadeIn(50);
        });
        active = false;
      } else {
        node.animate({opacity:0}, 200);
        wrongsLeft--;
      }
      updateScore();
    });
    MathJax.Hub.Queue(["Typeset",MathJax.Hub,button[0]]);
    MathJax.Hub.Queue(function () {
      // defer till typesetting happens
      $(container).append(node);
    });
  }
  
  var problemSetGenerators = {
    "factoring": function () {
      function factorlist() {
        var list = [];
        for (var i = randInt(0, 3); i < 4; i++) {
          var factor = randInt(1, 11);
          list.push(factor);
        }
        return list;
      }
      return {
        correct: function () {
          var factors = factorlist();
          var product = 1;
          for (var i = 0; i < factors.length; i++) {
            product *= factors[i];
          }
          return genProduct(factors) + " = " + product;
        },
        incorrect: function () {
          var factors = factorlist();
          var product = 1;
          for (var i = 0; i < factors.length; i++) {
            product *= factors[i];
          }
          factors.splice(randInt(0, factors.length), 1);
          return genProduct(factors) + " = " + product;
        }
      }
    },
    "derivatives": function () {
      var showAsIntegral = [false,true][randInt(0,2)];
      function show(f, fprime) {
        if (showAsIntegral)
          return "∫ " + fprime + "\\,dx = " + f + " + C";
        else
          return "\\frac{d}{dx} " + f + " = " + fprime;
      }
      return {
        correct: function () {
          var mult = randInt(1, 5);
          var formula = randInt(0, 4);
          return show(genProduct([mult, genExp("x",formula)]) , genProduct([mult * formula, genExp("x", formula-1)]));
        },
        incorrect: function () {
          var mult = randInt(1, 5);
          var formula = randInt(0, 4);
          return show(genProduct([mult, genExp("x",formula)]) , genProduct([mult * (formula-1), genExp("x", formula-1)]));
        }
      }
    }
  };
  
  function newProblems() {
    clearChoices();

    var problemSetType = pickRandomProperty(problemSetGenerators);
    problemSet = problemSetGenerators[problemSetType]();
    
    // generate choices-1 distinct correct formulas
    var problems = [];
    var seenCorrect = {};
    while (problems.length < choices - 1) {
      var problem = problemSet.correct();
      if (!Object.hasOwnProperty.call(seenCorrect, problem)) {
        seenCorrect[problem] = 1;
        problems.push(problem);
      }
    }
    //console.log(seenCorrect);
    
    // randomly insert incorrect formula
    var incorrectPos = randInt(0, choices);
    problems.splice(incorrectPos, 0, problemSet.incorrect());
    //console.log(problems);
    
    for (var i = 0; i < choices; i++)
      appendChoice(problems[i], i == incorrectPos ? "incorrect" : "correct");
      
    wrongsLeft = choices - 1;
    active = true;
  }

  // --- Final init ---
  updateScore();
  newProblems();
}
