### Guide on how to use the blogpost pipeline

Activate ```posts``` in ```content/home/posts.md```.


1. Create equations and text as ```post.lyx```
2. Merge with simulations: ```post.ipynb```, adhering to *regular* Markdown syntax. 

! Does not work yet:
```
4a. Convert to MyST markdown to preserve equation refs (https://jupyterbook.org/en/stable/file-types/myst-notebooks.html), 

jupytext post.ipynb --to myst

```

4. Append to Hugo Academic's ```content/post/XYZ/index.md```.
5. Build and test via ```hugo server```
6. ```git push```

