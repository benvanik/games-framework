# Simple sample build file
# Does nothing but provide some rules

Rule(
    name='a',
    srcs=['a.txt'])

Rule(
    name='b',
    srcs=['b.txt'])

Rule(
    name='c',
    srcs=['c.txt'],
    deps=[':a', ':b'])
