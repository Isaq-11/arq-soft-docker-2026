require("dotenv").config();

const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();

const PRODUTOS_URL =
    process.env.PRODUTOS_URL || "http://localhost:3001";

const CLIENTES_URL =
    process.env.CLIENTES_URL || "http://localhost:3003";


app.use(express.json());

connectDB();

const pedidoSchema = new mongoose.Schema({
    produto_id: Number,
    nome_produto: String,
    preco_unitario: Number,
    quantidade: Number,
    total: Number
});

const Pedido = mongoose.model(
    "Pedido",
    pedidoSchema
);

app.get("/pedidos", async (req, res) => {
    try {
        const resultado = await Pedido.find()
            .sort({ _id: 1 });

        res.json(resultado);

        const pedidosFormatados = await Promise.all(
            resultado.rows.map(async (pedidoBanco) => {
                try {
                    const respostaCliente = await axios.get(
                        `${CLIENTES_URL}/clientes/${pedidoBanco.cliente_id}`,
                        { timeout: 2000 }
                    );

                    const respostaProduto = await axios.get(
                        `${PRODUTOS_URL}/produtos/${pedidoBanco.produto_id}`,
                        { timeout: 2000 }
                    )

                    const cliente = respostaCliente.data;
                    const produto = respostaProduto.data;

                    return {
                        id: pedidoBanco.id,
                        cliente,
                        produto,
                        quantidade: pedidoBanco.quantidade,
                        total: pedidoBanco.total
                    };

                } catch {
                    return {
                        id: pedidoBanco.id, 
                        cliente: {
                            id: pedidoBanco.cliente_id, 
                            nome: "Dados indisponiveis"
                        },
                        produto: {
                            id: pedidoBanco.produto_id, 
                            nome: "Dados indisponiveis"
                        },
                        quantidade: pedidoBanco.quantidade,
                        total: pedidoBanco.total
                    };
                };
            })
        );

        res.json(pedidosFormatados);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar pedidos"
        });
    }
});


criarTabela();

app.listen(3002, () => {
    console.log("Pedidos rodando na porta 3002");
});