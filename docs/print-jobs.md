# Moteur de print jobs

La console de préparation couvre le périmètre MVP : A4 à A0, portrait/paysage, couleur ou noir et
blanc, nombre de copies et sélection de l'imprimante. L'interface masque les formats et modes couleur
incompatibles à partir de `printer_capabilities`.

La fonction SQL `create_print_job` reste l'autorité. Sous verrou du document, elle vérifie de nouveau
le statut `READY`, le rôle opérateur, l'organisation, l'état de l'imprimante et ses capacités. Elle
crée ensuite le job, les réglages, l'audit et la transition `WAITING_OPERATOR` dans une transaction.

Les clients authentifiés ne disposent plus des droits directs `INSERT` ou `UPDATE` sur
`print_jobs` et `print_settings`. La file `/dashboard/jobs` présente les travaux par état en attendant
la prise en charge atomique par le Print Agent.
