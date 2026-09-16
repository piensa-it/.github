#!/usr/bin/env python3
"""
Crea épicas + Historias de Usuario en GitHub y las agrega a un Project v2.

Uso:
    python crear_hu.py roadmap.json [--dry-run]

El JSON de entrada tiene esta forma:
{
  "repo": "piensa-it/app-midivisa",
  "project": {"owner": "piensa-it", "number": 3, "id": "PVT_..."},
  "fields": {
      "status": {"id": "PVTSSF_...", "options": {"Backlog": "f75ad846"}},
      "size":   {"id": "PVTSSF_...", "options": {"S": "f784b110"}}
  },
  "epics": [
    {
      "title": "Épica: ...",
      "body": "...",
      "labels": ["epica"],
      "status": "Backlog",
      "stories": [
        {"title": "...", "body": "...", "labels": ["hu"], "size": "M", "status": "Backlog"}
      ]
    }
  ]
}
"""
import json
import subprocess
import sys
import time
from pathlib import Path


def run(cmd, **kw):
    """Ejecuta un comando y devuelve stdout. Aborta con contexto si falla."""
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"Falló: {' '.join(cmd)}\n{r.stderr.strip()}")
    return r.stdout.strip()


def graphql(query, **variables):
    """Llama a la API GraphQL de GitHub con variables tipadas como strings."""
    cmd = ["gh", "api", "graphql", "-f", f"query={query}"]
    for k, v in variables.items():
        cmd += ["-f", f"{k}={v}"]
    return json.loads(run(cmd))


def crear_issue(repo, title, body, labels):
    """Crea un issue y devuelve (numero, url, node_id)."""
    cmd = ["gh", "issue", "create", "--repo", repo, "--title", title, "--body", body]
    for l in labels or []:
        cmd += ["--label", l]
    url = run(cmd)
    numero = int(url.rstrip("/").split("/")[-1])
    owner, name = repo.split("/")
    q = """query($owner:String!,$name:String!,$num:Int!){
      repository(owner:$owner,name:$name){ issue(number:$num){ id } } }"""
    cmd = ["gh", "api", "graphql", "-f", f"query={q}",
           "-F", f"owner={owner}", "-F", f"name={name}", "-F", f"num={numero}"]
    node_id = json.loads(run(cmd))["data"]["repository"]["issue"]["id"]
    return numero, url, node_id


def sub_issues_de(padre_id):
    """node_ids de los sub-issues que ya cuelgan de una épica."""
    q = """query($id:ID!){ node(id:$id){ ... on Issue {
      subIssues(first:100){ nodes{ id } } } } }"""
    return {n["id"] for n in graphql(q, id=padre_id)["data"]["node"]["subIssues"]["nodes"]}


def vincular_sub_issue(padre_id, hijo_id, ya_vinculados=None):
    """Cuelga un issue de su épica usando la API nativa de sub-issues.

    Se consulta el estado antes de mutar en vez de intentar y atrapar el
    error: GitHub devuelve un mensaje distinto según el motivo del rechazo,
    y distinguir "ya estaba" de un fallo real por el texto es frágil.
    """
    if ya_vinculados is None:
        ya_vinculados = sub_issues_de(padre_id)
    if hijo_id in ya_vinculados:
        return
    q = """mutation($parent:ID!,$child:ID!){
      addSubIssue(input:{issueId:$parent, subIssueId:$child}){
        issue{ number } } }"""
    graphql(q, parent=padre_id, child=hijo_id)


def buscar_item_en_proyecto(project_id, content_id):
    """Devuelve el id del item si el issue ya está en el tablero, o None."""
    q = """query($id:ID!){ node(id:$id){ ... on Issue {
      projectItems(first:20){ nodes{ id project{ id } } } } } }"""
    nodos = graphql(q, id=content_id)["data"]["node"]["projectItems"]["nodes"]
    return next((n["id"] for n in nodos if n["project"]["id"] == project_id), None)


def agregar_a_proyecto(project_id, content_id):
    """Agrega el issue al tablero y devuelve el id del item.

    GitHub auto-agrega los sub-issues al tablero de su épica, así que este
    add puede llegar tarde y chocar. En ese caso el item ya existe y lo que
    hace falta es su id, no volver a crearlo.
    """
    q = """mutation($project:ID!,$content:ID!){
      addProjectV2ItemById(input:{projectId:$project, contentId:$content}){
        item{ id } } }"""
    try:
        return graphql(q, project=project_id, content=content_id)["data"]["addProjectV2ItemById"]["item"]["id"]
    except RuntimeError as e:
        if "already exists" not in str(e):
            raise
        item = buscar_item_en_proyecto(project_id, content_id)
        if item is None:
            raise RuntimeError(f"El item existe pero no se encontró en el proyecto: {content_id}")
        return item


def titulos_existentes(repo):
    """Títulos de issues ya abiertos, para no duplicar al reanudar."""
    out = run(["gh", "issue", "list", "--repo", repo, "--limit", "300",
               "--state", "all", "--json", "number,title"])
    return {i["title"]: i["number"] for i in json.loads(out)}


def node_id_de(repo, numero):
    """node_id de un issue existente, para reanudar sin recrearlo."""
    owner, name = repo.split("/")
    q = """query($owner:String!,$name:String!,$num:Int!){
      repository(owner:$owner,name:$name){ issue(number:$num){ id } } }"""
    cmd = ["gh", "api", "graphql", "-f", f"query={q}",
           "-F", f"owner={owner}", "-F", f"name={name}", "-F", f"num={numero}"]
    return json.loads(run(cmd))["data"]["repository"]["issue"]["id"]


def set_select(project_id, item_id, field_id, option_id):
    """Fija el valor de un campo single-select (Status, Size, ...)."""
    q = """mutation($project:ID!,$item:ID!,$field:ID!,$opt:String!){
      updateProjectV2ItemFieldValue(input:{
        projectId:$project, itemId:$item, fieldId:$field,
        value:{singleSelectOptionId:$opt}}){ projectV2Item{ id } } }"""
    graphql(q, project=project_id, item=item_id, field=field_id, opt=option_id)


def descubrir_proyecto(owner, numero):
    """Resuelve el id del proyecto y los ids de sus campos single-select.

    Se consultan en vez de escribirse en el JSON porque son opacos, distintos
    en cada tablero, y cambian si alguien recrea un campo. Pedirlos al
    empezar cuesta una llamada y evita fallos silenciosos.
    """
    q = """query($owner:String!,$num:Int!){
      organization(login:$owner){ projectV2(number:$num){ id
        fields(first:50){ nodes{
          ... on ProjectV2SingleSelectField { id name options{ id name } } } } } } }"""
    cmd = ["gh", "api", "graphql", "-f", f"query={q}",
           "-F", f"owner={owner}", "-F", f"num={numero}"]
    p = json.loads(run(cmd))["data"]["organization"]["projectV2"]
    campos = {}
    for n in p["fields"]["nodes"]:
        if n and n.get("options"):
            campos[n["name"].lower()] = {
                "id": n["id"],
                "options": {o["name"]: o["id"] for o in n["options"]},
            }
    return p["id"], campos


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    plan = json.loads(Path(sys.argv[1]).read_text())
    dry = "--dry-run" in sys.argv

    repo = plan["repo"]
    project_id = plan["project"].get("id")
    campos = plan.get("fields")

    # Si el plan no trae los ids, se descubren del tablero.
    if not dry and (not project_id or not campos):
        project_id, campos = descubrir_proyecto(
            plan["project"]["owner"], plan["project"]["number"])

    if dry:
        print("=== DRY RUN — no se crea nada ===\n")
        for e in plan["epics"]:
            print(f"📦 {e['title']}")
            for s in e["stories"]:
                print(f"   └─ [{s.get('size','—'):>2}] {s['title']}")
            print()
        total = sum(1 + len(e["stories"]) for e in plan["epics"])
        print(f"Total a crear: {total} issues "
              f"({len(plan['epics'])} épicas + {total - len(plan['epics'])} HU)")
        return

    # Reanudable: si un título ya existe, se reusa el issue en vez de duplicarlo.
    # Importa porque una corrida puede cortarse a mitad por rate limit o red.
    existentes = titulos_existentes(repo)
    creados = []

    def obtener_o_crear(titulo, body, labels):
        """Devuelve (numero, node_id, era_nuevo)."""
        if titulo in existentes:
            num = existentes[titulo]
            return num, node_id_de(repo, num), False
        num, _, nid = crear_issue(repo, titulo, body, labels)
        return num, nid, True

    for e in plan["epics"]:
        num, epic_id, nuevo = obtener_o_crear(e["title"], e["body"], e.get("labels"))
        print(f"📦 Épica #{num}: {e['title']}" + ("" if nuevo else "  (ya existía)"))
        creados.append({"tipo": "epica", "numero": num})

        item_id = agregar_a_proyecto(project_id, epic_id)
        if e.get("status"):
            set_select(project_id, item_id, campos["status"]["id"],
                       campos["status"]["options"][e["status"]])

        # Se consulta una vez por épica y se va actualizando, en vez de
        # preguntar por cada HU.
        vinculados = sub_issues_de(epic_id)

        for s in e["stories"]:
            snum, sid, nuevo = obtener_o_crear(s["title"], s["body"], s.get("labels"))
            if nuevo:
                time.sleep(0.4)  # el rate limit de creación de issues es estrecho
            vincular_sub_issue(epic_id, sid, vinculados)
            vinculados.add(sid)
            sitem = agregar_a_proyecto(project_id, sid)
            if s.get("status"):
                set_select(project_id, sitem, campos["status"]["id"],
                           campos["status"]["options"][s["status"]])
            if s.get("size"):
                set_select(project_id, sitem, campos["size"]["id"],
                           campos["size"]["options"][s["size"]])
            print(f"   └─ #{snum} [{s.get('size','—')}] {s['title']}"
                  + ("" if nuevo else "  (ya existía)"))
            creados.append({"tipo": "hu", "numero": snum, "epica": num})

    Path("hu_creadas.json").write_text(json.dumps(creados, indent=2, ensure_ascii=False))
    print(f"\n✅ {len(creados)} issues creados. Detalle en hu_creadas.json")


if __name__ == "__main__":
    main()
