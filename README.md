# VWA-BackendServer
Der Backend-Server für mein [VWA-Spiel](https://github.com/pgr4567/VWA). 

## Architektur
Dieser Server war für den Spielclient nicht erreichbar und wurde intern vom Spielserver verwendet, um die Spieler zu authentifizieren und diesen Code nicht in der gemeinsamen Server-Client-Codebasis zu verteilen.
Hinter der Firewall greift dieser Server auf die Datenbank zu und verifiziert alle Events, die eine Authentifizierung des Spielers benötigen.

Der komplette Code ist in einer 1000-zeiligen Datei. Praktischerweise habe ich den Code nicht mit der VWA abgegeben.
