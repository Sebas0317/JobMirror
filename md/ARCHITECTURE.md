# Arquitectura del sistema


## Principio

Construir un sistema modular.

Cada componente debe poder evolucionar independientemente.


## Arquitectura general


Sources

↓

Job Collector

↓

Data Normalization

↓

Database

↓

AI Analysis Engine

↓

Compatibility Scoring

↓

Dashboard


## Componentes


### Job Collector

Responsable de obtener información de vacantes.

Debe soportar múltiples fuentes.


Ejemplo:

sources/

    computrabajo/
    indeed/
    magneto/
    elempleo/


Cada fuente debe ser independiente.


Debe permitir:

- activar/desactivar fuente
- configurar ciudad
- configurar palabras clave


---

### Profile Engine

Responsable de interpretar mi CV.


Entrada:

PDF CV


Salida:


profile.json


Ejemplo:


{
"name":"",
"target_roles":[
"Data Analyst",
"BI Analyst"
],

"skills":{
"SQL":8,
"Power BI":8,
"Excel":8,
"Python":6
},

"experience":"",
"education":"",
"preferences":""
}


---

### AI Analyzer


Debe analizar:

- descripción de vacante
- requisitos
- responsabilidades
- nivel del cargo


Debe evitar solamente buscar palabras.


Ejemplo:


Una vacante dice:

"crear indicadores comerciales"


Debe interpretar:

- BI
- dashboards
- KPIs
- reporting


---

### Dashboard


No crear una página pública.


Debe ser un dashboard personal tipo Career-Ops.


Prioridad:

CLI + interfaz simple.

