:() {
  canadarray=( buddy friend guy )
  i=0
  j=1
  while true; do
    (( i > ("${#canadarray[@]}" - 1) )) && i=0
    (( j > ("${#canadarray[@]}" - 1) )) && j=0
    printf -- "I'm not your %s, %s\n" "${canadarray[i]}" "${canadarray[j]}!"
    (( i++ )); (( j++ ))
  done
  }