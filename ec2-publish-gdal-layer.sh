
# update the Amazon Linux 2 and install the dependencies to compile gdal (and proj)
sudo yum update
sudo yum -y install make automake gcc gcc-c++ libcurl-devel sqlite-devel

# install proj dependency from source
wget https://download.osgeo.org/proj/proj-6.0.0.tar.gz
tar zxvf proj-6.0.0.tar.gz 
cd proj-6.0.0/
./configure
sudo make install
cd ..

# install gdal from source
wget https://github.com/OSGeo/gdal/releases/download/v3.1.2/gdal-3.1.2.tar.gz
tar zxvf gdal-3.1.2.tar.gz
cd gdal-3.1.2/
./configure
sudo make install
cd ..

# create layer directories for binaries and libraries
mkdir -p gdal-layer/lib
mkdir -p gdal-layer/bin


# discover glallocationinfo library dependencies with ldd
ldd /usr/local/bin/gdallocationinfo

// copy library dependencies to layer lib directory
cp /usr/local/lib/libgdal.so.27 gdal-layer/lib
cp /lib64/libstdc++.so.6 gdal-layer/lib
cp /lib64/libm.so.6 gdal-layer/lib
cp /lib64/libgcc_s.so.1 gdal-layer/lib
cp /lib64/libc.so.6 gdal-layer/lib
cp /lib64/libsqlite3.so.0 gdal-layer/lib
cp /usr/local/lib/libproj.so.15 gdal-layer/lib
cp /lib64/libpthread.so.0 gdal-layer/lib
cp /lib64/librt.so.1 gdal-layer/lib
cp /lib64/libdl.so.2 gdal-layer/lib
cp /lib64/libcurl.so.4 gdal-layer/lib
cp /lib64/ld-linux-x86-64.so.2 gdal-layer/lib
cp /lib64/libnghttp2.so.14 gdal-layer/lib
cp /lib64/libidn2.so.0 gdal-layer/lib
cp /lib64/libssh2.so.1 gdal-layer/lib
cp /lib64/libssl.so.10 gdal-layer/lib
cp /lib64/libcrypto.so.10 gdal-layer/lib
cp /lib64/libgssapi_krb5.so.2 gdal-layer/lib
cp /lib64/libkrb5.so.3 gdal-layer/lib
cp /lib64/libk5crypto.so.3 gdal-layer/lib
cp /lib64/libcom_err.so.2 gdal-layer/lib
cp /lib64/libldap-2.4.so.2 gdal-layer/lib
cp /lib64/liblber-2.4.so.2 gdal-layer/lib
cp /lib64/libz.so.1 gdal-layer/lib
cp /lib64/libunistring.so.0 gdal-layer/lib
cp /lib64/libkrb5support.so.0 gdal-layer/lib
cp /lib64/libkeyutils.so.1 gdal-layer/lib
cp /lib64/libresolv.so.2 gdal-layer/lib
cp /lib64/libsasl2.so.3 gdal-layer/lib
cp /lib64/libssl3.so gdal-layer/lib
cp /lib64/libsmime3.so gdal-layer/lib
cp /lib64/libnss3.so gdal-layer/lib
cp /lib64/libnssutil3.so gdal-layer/lib
cp /lib64/libplds4.so gdal-layer/lib
cp /lib64/libplc4.so gdal-layer/lib
cp /lib64/libnspr4.so gdal-layer/lib
cp /lib64/libselinux.so.1 gdal-layer/lib
cp /lib64/libcrypt.so.1 gdal-layer/lib
cp /lib64/libpcre.so.1 gdal-layer/lib

# copy gdal commands to layer bin directory
cp /usr/local/bin/gdal* gdal-layer/bin

# zip the layer
cd gdal-layer 
zip -r gdal-layer.zip bin lib 

# configure aws cli specifying:
export AWS_ACCESS_KEY_ID=<ACCESS_KEY_ID>
export AWS_SECRET_ACCESS_KEY=<SECRET_ACCESS_KEY>
export AWS_DEFAULT_REGION=<AWS_REGION>

# create a s3 bucket to store the layer
aws s3 mb s3://<BUCKET_NAME>

# copy the layer zipped to your s3 bucket
aws s3 cp gdal-layer.zip s3://<BUCKET_NAME> 

# finally, publish the layer from S3
aws lambda publish-layer-version   --layer-name gdal \
--description "gdal Layer" --license-info "MIT" \
--content S3Bucket=<BUCKET_NAME>,S3Key=gdal-layer.zip \
--compatible-runtimes nodejs12.x  

                                                                                                                                                                                        