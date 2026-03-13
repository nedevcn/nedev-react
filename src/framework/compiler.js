import * as t from '@babel/types';

export default function solidReactCompiler() {
  return {
    name: 'react-no-vdom-jsx',
    visitor: {
      Program(path) {
        // Find useState declarations and transform them
        path.traverse({
          VariableDeclarator(varPath) {
            // Looking for: const [count, setCount] = useState(init)
            if (
              t.isArrayPattern(varPath.node.id) &&
              varPath.node.init &&
              t.isCallExpression(varPath.node.init) &&
              t.isIdentifier(varPath.node.init.callee, { name: 'useState' })
            ) {
              const stateNameNode = varPath.node.id.elements[0];
              const setterNameNode = varPath.node.id.elements[1];

              if (t.isIdentifier(stateNameNode) && t.isIdentifier(setterNameNode)) {
                const stateName = stateNameNode.name;
                const setterName = setterNameNode.name;
                
                // Track this component's scope
                const scope = varPath.scope;
                
                // We're converting const [count, setCount] = useState(0)
                // into: 
                // const _raw_count = useState(0); 
                // (where useState returns a signal object { get, set })
                
                const rawName = `_raw_${stateName}`;
                
                // Substitute the declaration:
                varPath.replaceWith(
                  t.variableDeclarator(
                    t.identifier(rawName),
                    varPath.node.init
                  )
                );
                
                // Insert setter assignment: const setCount = _raw_count.set;
                varPath.parentPath.insertAfter(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier(setterName),
                      t.memberExpression(t.identifier(rawName), t.identifier('set'))
                    )
                  ])
                );
                
                // Now replace ALL read references to `count` in the scope with `_raw_count.get()`
                // We must do this safely.
                scope.path.traverse({
                  Identifier(idPath) {
                    if (idPath.node.name === stateName && idPath.isReferencedIdentifier()) {
                      // Avoid replacing the declaration itself, though we already replaced it
                      idPath.replaceWith(
                        t.callExpression(
                          t.memberExpression(t.identifier(rawName), t.identifier('get')),
                          []
                        )
                      );
                    }
                  }
                });
              }
            }
          },

          // Transform JSX expressions into getter functions for reactivity
          JSXExpressionContainer(jsxPath) {
            const { node, parent } = jsxPath;
            if (t.isJSXEmptyExpression(node.expression)) return;
            
            // Prevent infinite loop & double wrapping: if the expression is already a function, do NOT wrap it.
            // This allows event handlers, render props (children={(item) => ReactNode}), etc.
            if (
              t.isArrowFunctionExpression(node.expression) || 
              t.isFunctionExpression(node.expression)
            ) {
              return;
            }

            if (t.isJSXAttribute(parent)) {
              const attrName = parent.name.name;
              if (typeof attrName === 'string' && attrName.startsWith('on')) {
                return;
              }
              const newContainer = t.jsxExpressionContainer(
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('__g'),
                    t.arrowFunctionExpression([], node.expression)
                  )
                ])
              );
              jsxPath.replaceWith(newContainer);
              jsxPath.skip(); // <--- Prevent re-traversing the replaced node
            } else if (t.isJSXElement(parent) || t.isJSXFragment(parent)) {
              const newContainer = t.jsxExpressionContainer(
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('__g'),
                    t.arrowFunctionExpression([], node.expression)
                  )
                ])
              );
              jsxPath.replaceWith(newContainer);
              jsxPath.skip(); // <--- Prevent re-traversing
            }
          },

          // Transform JSX elements that are direct children of another element/fragment into lazy getters
          JSXElement(path) {
            const parent = path.parent;
            // Only transform if it's a child of another JSX element or fragment
            if (t.isJSXElement(parent) || t.isJSXFragment(parent)) {
              const newContainer = t.jsxExpressionContainer(
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('__g'),
                    t.arrowFunctionExpression([], path.node)
                  )
                ])
              );
              path.replaceWith(newContainer);
              path.skip(); // Prevent infinite wrapping
            }
          }
        });
      }
    }
  };
}
