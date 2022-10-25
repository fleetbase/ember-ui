#! /bin/sh
ember destroy component table
ember destroy component table/cell
ember destroy component table/tbody
ember destroy component table/td
ember destroy component table/th
ember destroy component table/thead
ember destroy component table/tr

ember g component table -gc
ember g component table/body -gc
ember g component table/head -gc
ember g component table/foot -gc
ember g component table/row -gc
ember g component table/cell -gc