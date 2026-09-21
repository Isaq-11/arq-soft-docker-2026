const express = require("express");
const db = require("./db");

const app = express();

app.use(express.json());

app.get("/clientes", async (req, res) => {
    try {
        const resultado = await db.query(
            "SELECT * FROM clientes ORDER BY id"
        );
        res.json(resultado.rows);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar clientes" });
    }
});