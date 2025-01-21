# Define the default target
all: main.md

# Target for main.tex from main.lyx
main.tex: main.lyx
	lyx -e latex main.lyx

# Target for main.md from main.tex
main.md: main.tex
	pandoc --wrap=none -f latex -t markdown -o main.md main.tex

# Clean up generated files
clean:
	rm -f main.tex main.md

.PHONY: all clean
