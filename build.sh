VERSION=`date +%Y%m%d%H%M`
quasar build;
tar zcvf test_versions/test_$VERSION.tar.gz dist
git add test_versions/test_$VERSION.tar.gz
git commit -a -m test_$VERSION
git push
