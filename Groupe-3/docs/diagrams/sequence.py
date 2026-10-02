import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

actors = ["Client", "Routes\n(Express)", "OrderService", "Catalogue\n(Groupe 2)", "Base de\ndonnées"]
x = [1, 3.4, 5.9, 8.4, 10.8]
msgs = [
    (0, 1, "POST /api/orders (adresse, paiement)", False),
    (1, 1, "authentifie le jeton, vérifie le rôle", True),
    (1, 2, "createOrder(user, données)", False),
    (2, 4, "lire les lignes du panier", False),
    (2, 3, "getProduct(id) : nom, prix, stock", False),
    (2, 3, "reserveStock(lignes) : tout ou rien", False),
    (3, 2, "OK  (ou 409 INSUFFICIENT_STOCK)", False),
    (2, 4, "TRANSACTION : commande + lignes + historique + panier vidé", False),
    (4, 2, "OK  (si erreur : releaseStock = compensation)", False),
    (2, 1, "commande PENDING", False),
    (1, 0, "201 Created + commande", False),
]
n = len(msgs)
fig, ax = plt.subplots(figsize=(12, 8.2))
ax.set_xlim(0, 12); ax.set_ylim(-n - 1.2, 1.4); ax.axis("off")
for a, xi in zip(actors, x):
    ax.text(xi, 0.7, a, ha="center", va="center", fontsize=10, fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.4", fc="#1F3864", ec="#1F3864"), color="white")
    ax.plot([xi, xi], [0.2, -n - 0.8], color="#999999", lw=1, ls="--")
for i, (s, d, label, selfcall) in enumerate(msgs):
    y = -i - 0.6
    if selfcall:
        xs = x[s]
        ax.plot([xs, xs + 0.7, xs + 0.7, xs], [y + 0.12, y + 0.12, y - 0.22, y - 0.22], color="#C55A11", lw=1.4)
        ax.annotate("", xy=(xs, y - 0.22), xytext=(xs + 0.25, y - 0.22), arrowprops=dict(arrowstyle="->", color="#C55A11"))
        ax.text(xs + 0.85, y - 0.05, label, fontsize=9, va="center")
    else:
        back = x[d] < x[s]
        ax.annotate("", xy=(x[d], y), xytext=(x[s], y),
                    arrowprops=dict(arrowstyle="->", color="#1F3864" if not back else "#548235", lw=1.4,
                                    ls="--" if back else "-"))
        ax.text((x[s] + x[d]) / 2, y + 0.16, label, fontsize=9, ha="center", va="bottom")
ax.set_title("Diagramme de séquence – Passer une commande (CU4)", fontsize=12, fontweight="bold", color="#1F3864")
plt.tight_layout()
plt.savefig("sequence.png", dpi=130)
