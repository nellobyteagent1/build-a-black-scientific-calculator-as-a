(function () {
    'use strict';

    const expressionEl = document.getElementById('expression');
    const resultEl = document.getElementById('result');

    let expression = '';
    let currentResult = '0';
    let lastAnswer = null;
    let justEvaluated = false;
    let openParens = 0;

    function updateDisplay() {
        expressionEl.textContent = formatExpression(expression);
        resultEl.textContent = currentResult;
        resultEl.classList.toggle('shrink', currentResult.length > 12);
    }

    function formatExpression(expr) {
        return expr
            .replace(/\*/g, '\u00D7')
            .replace(/\//g, '\u00F7')
            .replace(/-/g, '\u2212')
            .replace(/Math\.PI/g, '\u03C0')
            .replace(/Math\.E(?!\w)/g, 'e')
            .replace(/Math\.sqrt\(/g, '\u221A(')
            .replace(/Math\.log10\(/g, 'log(')
            .replace(/Math\.log\(/g, 'ln(')
            .replace(/Math\.sin\(/g, 'sin(')
            .replace(/Math\.cos\(/g, 'cos(')
            .replace(/Math\.tan\(/g, 'tan(')
            .replace(/Math\.pow\(/g, 'pow(')
            .replace(/\*\*/g, '^');
    }

    function isOperator(ch) {
        return ['+', '-', '*', '/'].includes(ch);
    }

    function lastChar() {
        return expression.slice(-1);
    }

    function appendToExpression(str) {
        if (justEvaluated) {
            // If we just evaluated and user types a number, start fresh
            if (/[0-9.]/.test(str.charAt(0))) {
                expression = '';
                openParens = 0;
            }
            justEvaluated = false;
        }
        expression += str;
        tryLiveEvaluate();
        updateDisplay();
    }

    function tryLiveEvaluate() {
        try {
            let tempExpr = expression;
            // Auto-close open parens for live preview
            let temp = openParens;
            while (temp > 0) {
                tempExpr += ')';
                temp--;
            }
            const val = safeEval(tempExpr);
            if (val !== null && isFinite(val)) {
                currentResult = formatNumber(val);
            }
        } catch (e) {
            // Keep previous result on parse error
        }
    }

    function safeEval(expr) {
        // Only allow math operations
        const sanitized = expr
            .replace(/\^/g, '**');

        // Validate: only allow digits, operators, parens, dots, Math functions
        if (/[^0-9+\-*/().%eE\s]/.test(sanitized.replace(/Math\.\w+/g, ''))) {
            return null;
        }

        try {
            return Function('"use strict"; return (' + sanitized + ')')();
        } catch (e) {
            return null;
        }
    }

    function formatNumber(num) {
        if (Number.isInteger(num) && Math.abs(num) < 1e15) {
            return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        // Limit to 10 significant digits
        const str = Number(num.toPrecision(10)).toString();
        if (str.length > 16) {
            return num.toExponential(6);
        }
        return str;
    }

    function handleAction(action) {
        switch (action) {
            // Numbers
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
                appendToExpression(action);
                break;

            case 'decimal':
                // Prevent multiple decimals in current number
                const parts = expression.split(/[+\-*/()]/);
                const current = parts[parts.length - 1];
                if (!current.includes('.')) {
                    if (expression === '' || isOperator(lastChar()) || lastChar() === '(') {
                        appendToExpression('0.');
                    } else {
                        appendToExpression('.');
                    }
                }
                break;

            // Operators
            case 'add':
                appendOperator('+');
                break;
            case 'subtract':
                appendOperator('-');
                break;
            case 'multiply':
                appendOperator('*');
                break;
            case 'divide':
                appendOperator('/');
                break;

            // Scientific functions
            case 'sin':
                appendFunction('Math.sin(');
                break;
            case 'cos':
                appendFunction('Math.cos(');
                break;
            case 'tan':
                appendFunction('Math.tan(');
                break;
            case 'log':
                appendFunction('Math.log10(');
                break;
            case 'ln':
                appendFunction('Math.log(');
                break;
            case 'sqrt':
                appendFunction('Math.sqrt(');
                break;

            case 'power':
                if (expression !== '' && !isOperator(lastChar()) && lastChar() !== '(') {
                    appendToExpression('**');
                }
                break;

            case 'pi':
                if (justEvaluated) {
                    expression = '';
                    openParens = 0;
                    justEvaluated = false;
                }
                if (expression !== '' && !isOperator(lastChar()) && lastChar() !== '(' && lastChar() !== '') {
                    appendToExpression('*Math.PI');
                } else {
                    appendToExpression('Math.PI');
                }
                break;

            case 'e':
                if (justEvaluated) {
                    expression = '';
                    openParens = 0;
                    justEvaluated = false;
                }
                if (expression !== '' && !isOperator(lastChar()) && lastChar() !== '(') {
                    appendToExpression('*Math.E');
                } else {
                    appendToExpression('Math.E');
                }
                break;

            case 'paren':
                handleParenthesis();
                break;

            case 'percent':
                if (expression !== '' && !isOperator(lastChar())) {
                    appendToExpression('/100');
                }
                break;

            case 'toggle':
                toggleSign();
                break;

            case 'clear':
                expression = '';
                currentResult = '0';
                openParens = 0;
                justEvaluated = false;
                updateDisplay();
                break;

            case 'delete':
                handleDelete();
                break;

            case 'equals':
                evaluate();
                break;
        }
    }

    function appendOperator(op) {
        if (justEvaluated) {
            expression = lastAnswer !== null ? lastAnswer.toString() : currentResult.replace(/,/g, '');
            justEvaluated = false;
        }
        if (expression === '' && op === '-') {
            appendToExpression('-');
            return;
        }
        if (expression === '') return;

        // Replace last operator if exists
        if (isOperator(lastChar())) {
            expression = expression.slice(0, -1);
        }
        appendToExpression(op);
    }

    function appendFunction(fn) {
        if (justEvaluated) {
            expression = '';
            openParens = 0;
            justEvaluated = false;
        }
        // Auto-multiply if preceded by number or closing paren
        if (expression !== '' && !isOperator(lastChar()) && lastChar() !== '(' && lastChar() !== '') {
            expression += '*';
        }
        expression += fn;
        openParens++;
        tryLiveEvaluate();
        updateDisplay();
    }

    function handleParenthesis() {
        if (justEvaluated) {
            expression = '';
            openParens = 0;
            justEvaluated = false;
        }
        const lc = lastChar();
        // Open paren: at start, after operator, after open paren
        if (expression === '' || isOperator(lc) || lc === '(') {
            expression += '(';
            openParens++;
        }
        // Close paren: if we have open parens and last char is a number or close paren
        else if (openParens > 0 && (lc === ')' || /[0-9]/.test(lc) || lc === 'I' || lc === 'E')) {
            expression += ')';
            openParens--;
        }
        // Otherwise open a new group with implicit multiply
        else {
            expression += '*(';
            openParens++;
        }
        tryLiveEvaluate();
        updateDisplay();
    }

    function toggleSign() {
        if (expression === '') return;
        if (justEvaluated && lastAnswer !== null) {
            expression = (lastAnswer * -1).toString();
            currentResult = formatNumber(lastAnswer * -1);
            lastAnswer = lastAnswer * -1;
            updateDisplay();
            return;
        }
        // Wrap current expression with negation
        expression = '(-1)*(' + expression + ')';
        tryLiveEvaluate();
        updateDisplay();
    }

    function handleDelete() {
        if (justEvaluated) {
            expression = '';
            currentResult = '0';
            openParens = 0;
            justEvaluated = false;
            updateDisplay();
            return;
        }
        if (expression === '') return;

        // Check if we're deleting a Math function
        const funcMatch = expression.match(/(Math\.\w+\()$/);
        if (funcMatch) {
            expression = expression.slice(0, -funcMatch[0].length);
            openParens--;
        } else {
            const removed = lastChar();
            expression = expression.slice(0, -1);
            if (removed === '(') openParens--;
            if (removed === ')') openParens++;
        }

        if (expression === '') {
            currentResult = '0';
        } else {
            tryLiveEvaluate();
        }
        updateDisplay();
    }

    function evaluate() {
        if (expression === '') return;

        let evalExpr = expression;
        // Auto-close parens
        while (openParens > 0) {
            evalExpr += ')';
            openParens--;
        }

        try {
            const val = safeEval(evalExpr);
            if (val === null || !isFinite(val)) {
                currentResult = 'Error';
                lastAnswer = null;
            } else {
                lastAnswer = val;
                currentResult = formatNumber(val);
                expressionEl.textContent = formatExpression(evalExpr) + ' =';
            }
        } catch (e) {
            currentResult = 'Error';
            lastAnswer = null;
        }

        expression = '';
        openParens = 0;
        justEvaluated = true;
        resultEl.textContent = currentResult;
        resultEl.classList.toggle('shrink', currentResult.length > 12);
    }

    // Event listeners
    document.querySelectorAll('.btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            handleAction(this.dataset.action);
        });
    });

    // Keyboard support
    document.addEventListener('keydown', function (e) {
        const key = e.key;
        const map = {
            '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
            '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
            '.': 'decimal', '+': 'add', '-': 'subtract',
            '*': 'multiply', '/': 'divide', '%': 'percent',
            'Enter': 'equals', '=': 'equals',
            'Backspace': 'delete', 'Delete': 'delete',
            'Escape': 'clear', 'c': 'clear', 'C': 'clear',
            '(': 'paren', ')': 'paren',
            '^': 'power',
            'p': 'pi', 's': 'sin', 'l': 'log', 'n': 'ln',
            'q': 'sqrt', 't': 'tan'
        };

        if (map[key]) {
            e.preventDefault();
            handleAction(map[key]);
        }
    });

    updateDisplay();
})();
