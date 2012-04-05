# Simple sample build file
# Does nothing but provide some rules

rule('a',
     srcs=['a.txt'])

rule('b',
    srcs=['b.txt'])

rule('c',
    srcs=['c.txt'],
    deps=[':a', ':b'])

rule('local_txt',
    srcs='*.txt')
rule('recursive_txt',
    srcs='**/*.txt')

rule('local_txt_filter',
    srcs='*',
    src_filter='*.txt')
rule('recursive_txt_filter',
    srcs='**/*',
    src_filter='*.txt')

rule('file_input',
    srcs='a.txt')
rule('rule_input',
    srcs=':file_input')
rule('mixed_input',
    srcs=['b.txt', ':file_input'])
rule('missing_input',
    srcs=':x')
