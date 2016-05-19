__author__ = 'scottsfarley'

import glob
import os

dir = '/Users/scottsfarley/documents/paleoview/assets/data/geojson'

for f in os.listdir(dir):
    old_name = f.replace(".geojson", "")
    full_name = dir + "/" + f
    new_name = old_name.upper()
    new_full = dir + "/" + new_name + ".geojson"
    os.rename(full_name, new_full)
