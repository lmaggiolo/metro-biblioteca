#!/bin/bash

input_file="./libri-vecchio-database.txt"
output_file="./insert_books.sql"

# Crea la directory di output se non esiste
mkdir -p "$(dirname "$output_file")"

# Scrive BEGIN; all'inizio del file di output
echo "BEGIN;" > "$output_file"

# Legge il file di input linea per linea
while IFS=$'\t' read -r nome autore categoria pagine prezzo
do
    # Gestisce gli apostrofi singoli nei campi di testo
    nome_clean=${nome//\'/\'\'}
    autore_clean=${autore//\'/\'\'}
    categoria_clean=${categoria//\'/\'\'}

    # Genera la query di insert con createdAt impostato all'ora attuale e la indenta
    echo "    INSERT INTO books (nome, autore, categoria, pagine, prezzo, insertedBy, createdAt) VALUES ('$nome_clean', '$autore_clean', '$categoria_clean', $pagine, $prezzo, 2, CURRENT_TIMESTAMP);" >> "$output_file"
done < "$input_file"

# Scrive END; alla fine del file di output
echo "END;" >> "$output_file"
