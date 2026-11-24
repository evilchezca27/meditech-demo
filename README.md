# Prototipos de operaciones Meditech

Prototipos de interfaz para revisar el **Cuadro de Salidas**, el flujo de **Salida e Internamiento de Material** y la **Convocatoria de Instrumentistas**.

## Abrir

Abre `login.html` para iniciar el recorrido del prototipo; al ingresar se abre `index.html` (Cuadro de Salidas). Desde allí puedes ir a `salida-internamiento.html` o `convocatorias.html`. No necesitan instalar paquetes. El login y el rol elegido son demostrativos y todavía no validan usuarios reales. Para compartir datos entre módulos, las páginas deben abrirse desde el mismo origen del navegador.

## Convocatoria de Instrumentistas

- Permite al Operador registrar, actualizar y cancelar una convocatoria, vincularla opcionalmente a un pedido y escoger el instrumentista desde el catálogo compartido.
- Usa los estados Pendiente, Confirmado y Cancelado. También permite dejar constancia explícita de que un pedido no requiere instrumentista.
- Si se vincula con un pedido, sincroniza el nombre del instrumentista o el valor “No requiere” con la columna Instrumentista solicitado del Cuadro de Salidas. Cuando aún no hay decisión, muestra “Sin convocatoria”.
- Registra paciente, institución, doctor, fecha y hora de cirugía, quién realizó la convocatoria y una observación breve.
- Permite adjuntar posteriormente la foto o archivo del consumo recibido de la clínica o del instrumentista; los perfiles Administrador y Jefatura solo consultan los datos y los adjuntos.
- El documento del consumo sirve como evidencia y no registra piezas ni descuenta existencias desde este módulo.
- Incluye dos filas ficticias de ejemplo y comparte convocatorias y adjuntos entre pestañas del mismo navegador.

## Salida e Internamiento

- Permite generar pedidos dentro del módulo y verlos en la lista con un correlativo estable.
- Muestra los pedidos por set, sin detallar las piezas internas en este módulo.
- Permite adjuntar cotización, receta y otros archivos en PNG, JPG, PDF o Word.
- Deja opcionales los datos del pedido y permite editarlo sin cambiar su correlativo.
- Permite avanzar el pedido por preparación, fotos, confirmación de que la guía externa fue elaborada, control de calidad, salida e internamiento.
- Incluye registro de responsables de armado, revisión y logística.
- Permite adjuntar fotos del material preparado y después la guía firmada; el sistema no genera la guía.
- Permite quitar una foto seleccionada, abrir la guía elaborada en PDF y consultar los documentos y fotos desde el listado del pedido después de registrar la salida.
- Si se edita un pedido después de registrar su salida, permite completar/corregir información y volver a registrar el envío; pide una nueva guía firmada para cerrar el internamiento.
- Al generar un pedido, comparte sus datos básicos con el Cuadro de Salidas y crea una fila con correlativo `CS-MMNN` para que se completen allí los demás campos.
- Permite cancelar un pedido y filtrarlo por estado, o eliminarlo por completo con confirmación.
- Mantiene accesos a los catálogos de Instituciones y Personal Operativo desde este módulo; sus cambios se comparten entre las dos pantallas.
- Distingue tres perfiles de demostración: Operador (Almacén), Administrador (Administración y Finanzas) y Jefatura (solo lectura). Operador ve y edita los campos de Almacén y procesa la preparación. Administrador consulta esos datos, completa los de Administración/Finanzas, gestiona catálogos y genera, edita, cancela o elimina pedidos sin intervenir en la preparación. Jefatura consulta módulos y catálogos sin acciones de modificación.
- Oculta “Iniciar preparación” después de iniciar el flujo y cierra la edición cuando el internamiento ya está confirmado.
- En el control de calidad solo se puede dejar pendiente o aprobar; la observación queda como aviso opcional.
- Registra responsables ficticios de armado, revisión de calidad y logística que interna el material.
- Diferencia la salida física del material, la confirmación posterior del consumo y la disponibilidad del instrumental tras lavado y recepción en Pueblo Libre.
- Usa datos ficticios y solo de demostración. El Cuadro de Salidas y el listado de pedidos generados se enlazan mediante almacenamiento local del navegador; las evidencias y el avance operativo no tienen persistencia real.

## Alcance de esta primera iteración

- Muestra las columnas del Cuadro de Salidas agrupadas por Almacén, Administración y Finanzas.
- Separa los registros con pestañas por mes y asigna códigos visibles con el formato `CS-MMNN` (por ejemplo, `CS-1001`: primera salida de octubre).
- Incluye los datos de Almacén observados: institución, responsables de la venta, instrumentista solicitado, conductor, consumo, fecha y hora de CX, guía de remisión, observaciones y fecha de recojo.
- Incluye catálogos separados para añadir, editar y borrar instituciones, instrumentistas y conductores.
- En el catálogo de instituciones permite los tipos clínica, hospital, doctor y casa comercial.
- Permite añadir instrumentistas y conductores desde el formulario y seleccionarlos en sus desplegables.
- Permite buscar registros de ejemplo y filtrar los que tienen factura pendiente.
- Permite escoger una columna concreta o buscar en todas las columnas; el consumo se busca por código, nombre o cantidad.
- Permite añadir una salida de ejemplo y editar los campos de Almacén de una fila.
- La ventana de consumo sirve para registrar o corregir líneas: se pueden quitar y volver a añadir antes de guardar.
- Permite buscar consumibles escribiendo su nombre o código, seleccionar una sugerencia y registrar cantidad.
- Muestra el resumen y el detalle de los códigos consumidos directamente en la tabla. Al confirmarlo, simula el descuento en el stock ficticio.
- Usa datos ficticios. Las filas nuevas escritas manualmente y sus cambios existen solo en la memoria del navegador; las filas generadas desde Pedidos se comparten mediante almacenamiento local.
- Exige guía de internamiento, paciente, institución y material al registrar una salida.

## Importante

Este archivo es solo un prototipo visual para validar el módulo. El login y los roles solo simulan la interfaz: no hay validación real de usuarios ni permisos de seguridad. Todavía no incluye backend, base de datos SQL Server, almacenamiento persistente de archivos ni exportación a Excel. La actualización de stock es una simulación del navegador. Las reglas de acceso deben aplicarse en el backend antes de usar datos de la empresa.

## Próximos pasos del desarrollo

1. Revisar los nombres y el orden de las columnas con el Cuadro de Salidas actual.
2. Acordar qué campos son obligatorios y quién los registra.
3. Diseñar el inventario para que el consumo reste unidades por código una sola vez y deje un movimiento auditable.
4. Diseñar la base de datos y los permisos por rol.
5. Conectar una primera versión del módulo con el backend y SQL Server.
