I'm facing a discrepancy between my development and production builds. The production build unexpectedly includes jsxdev syntax, leading to runtime errors. Although using jiti as a transpiler can mitigate this issue, I'd like to explore other approaches to eliminate the need for jiti.


# use entrypointLoader: 'jiti',

![img.png](img.png)

# remove entrypointLoader: 'jiti',

![img_1.png](img_1.png)
