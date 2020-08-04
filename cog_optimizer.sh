#!/bin/bash
set -x #echo on

# run this scripts in the directory containing tiffs

mkdir -p optimized

for d in *.TIF; do
 gdal_translate $d optimized/$d -co TILED=YES -co COPY_SRC_OVERVIEWS=YES -co COMPRESS=DEFLATE
 one
 