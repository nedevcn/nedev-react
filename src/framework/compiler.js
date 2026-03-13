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
            // or: const [state, dispatch] = useReducer(reducer, init)
            if (
              t.isArrayPattern(varPath.node.id) &&
              varPath.node.init &&
              t.isCallExpression(varPath.node.init)
            ) {
              const callee = varPath.node.init.callee;
              const isUseState = t.isIdentifier(callee, { name: 'useState' });
              const isUseReducer = t.isIdentifier(callee, { name: 'useReducer' });
              
              if (!isUseState && !isUseReducer) return;

              const stateNameNode = varPath.node.id.elements[0];
              const secondNameNode = varPath.node.id.elements[1];

              if (t.isIdentifier(stateNameNode) && t.isIdentifier(secondNameNode)) {
                const stateName = stateNameNode.name;
                const secondName = secondNameNode.name;
                
                // Track this component's scope
                const scope = varPath.scope;
                
                // Converting:
                //   const [count, setCount] = useState(0)      → _raw_count = useState(0); setCount = _raw_count.set
                //   const [state, dispatch] = useReducer(r, s)  → _raw_state = useReducer(r, s); dispatch = _raw_state.dispatch
                
                const rawName = `_raw_${stateName}`;
                
                // Substitute the declaration:
                varPath.replaceWith(
                  t.variableDeclarator(
                    t.identifier(rawName),
                    varPath.node.init
                  )
                );
                
                // Insert second binding: .set for useState, .dispatch for useReducer
                const memberName = isUseReducer ? 'dispatch' : 'set';
                varPath.parentPath.insertAfter(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier(secondName),
                      t.memberExpression(t.identifier(rawName), t.identifier(memberName))
                    )
                  ])
                );
                
                // Replace ALL read references to state name with _raw_state.get()
                scope.path.traverse({
                  Identifier(idPath) {
                    if (idPath.node.name === stateName && idPath.isReferencedIdentifier()) {
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
          JSXElement: {
            exit(path) {
              const parent = path.parent;
              // Prevent Double Wrapping if already wrapped in our __lazy or __g obj
              if (t.isObjectProperty(parent)) return;

              if (t.isJSXElement(parent) || t.isJSXFragment(parent)) {
                 const newContainer = t.jsxExpressionContainer(
                   t.objectExpression([
                     t.objectProperty(
                       t.identifier('__lazy'),
                       t.arrowFunctionExpression([], path.node)
                     )
                   ])
                 );
                 path.replaceWith(newContainer);
                 path.skip();
              } else if (t.isJSXExpressionContainer(parent)) {
                 // For cases like `fallback={<Comp />}` or `<div>{<Comp/>}</div>`
                 const obj = t.objectExpression([
                     t.objectProperty(
                       t.identifier('__lazy'),
                       t.arrowFunctionExpression([], path.node)
                     )
                 ]);
                 path.replaceWith(obj);
                 path.skip();
              }
            }
          },
          JSXFragment: {
            exit(path) {
              const parent = path.parent;
              if (t.isObjectProperty(parent)) return;

              if (t.isJSXElement(parent) || t.isJSXFragment(parent)) {
                 const newContainer = t.jsxExpressionContainer(
                   t.objectExpression([
                     t.objectProperty(
                       t.identifier('__lazy'),
                       t.arrowFunctionExpression([], path.node)
                     )
                   ])
                 );
                 path.replaceWith(newContainer);
                 path.skip();
              } else if (t.isJSXExpressionContainer(parent)) {
                 const obj = t.objectExpression([
                     t.objectProperty(
                       t.identifier('__lazy'),
                       t.arrowFunctionExpression([], path.node)
                     )
                 ]);
                 path.replaceWith(obj);
                 path.skip();
              }
            }
          }
        });
      }
    }
  };
}
