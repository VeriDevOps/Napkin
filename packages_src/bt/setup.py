import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="daniel.flemstrom", # Replace with your own username
    version="0.0.1",
    author="Daniel Flemström",
    author_email="daniel.flemstrom@ri.se",
    description="SAGA BT functions",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/pypa/sampleproject ",
    packages=setuptools.find_packages(),
     install_requires=[
          'bottle', 
          'pandas',
          'xlrd'
      ],
    #python_requires='>=3.6',
)
