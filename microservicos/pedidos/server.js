const express = require("express");
const axios = require("axios");
const db = require("./db");

const app = express();

const PRODUTOS_URL =
    process.env.PRODUTOS_URL || "http://localhost:3001";

const CLIENTES_URL =
    process.env.CLIENTES_URL || "http://localhost:3003";


app.use(express.json());

const pedidos = [];

/*app.get("/pedidos", (req, res) => {
    res.json(pedidos);
});*/

app.get("/pedidos", async (req, res) => {
    try {
        const resultado = await db.query(
            "SELECT * FROM pedidos ORDER BY id"
        );

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

/*app.post("/pedidos", async (req, res) => {
    const { produtoId, quantidade } = req.body;

    if (!produtoId || !quantidade || quantidade <= 0) {
        return res.status(400).json({
            erro: "produtoId e quantidade válida são obrigatórios"
        });
    }

    try {
        const resposta = await axios.get(
            `${PRODUTOS_URL}/produtos/${produtoId}`,
            {
                timeout: 3000
            }
        );

        const produto = resposta.data;

        const pedido = {
            id: pedidos.length + 1,
            produto,
            quantidade,
            total: produto.preco * quantidade
        };

        pedidos.push(pedido);

        res.status(201).json(pedido);
    } catch (erro) {
        if (erro.response?.status === 404) {
            return res.status(400).json({
                erro: "Produto não encontrado"
            });
        }

        return res.status(503).json({
            erro: "Serviço de Produtos indisponível"
        });
    }
});*/

app.post("/pedidos", async (req, res) => {
    const { clienteId, produtoId, quantidade } = req.body;

    if (!clienteId || !produtoId || !quantidade || quantidade <=0){
        return res.status(400).json({
            erro: "clienteId, produtoId e quantidade válida são obrigatórios"
        });
    }

    try {
        const respostaCliente = await axios.get(
            `${CLIENTES_URL}/clientes/${clienteId}`, 
            { timeout: 3000 }
        );

        const cliente = respostaCliente.data;

        const repostaProduto = await axios.get(
            `${PRODUTOS_URL}/produtos/${produtoId}`,
            { timeout: 3000 }
        );

        const produto = repostaProduto.data;
        const total = produto.preco * quantidade;

        const resultado = await db.query(
            `INSERT INTO pedidos (
                cliente_id, produto_id, nome_produto, preco_unitario, quantidade, total
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`, 
            [clienteId, produtoId, produto.nome, produto.preco, quantidade, total]
        );

        const pedidoBanco = resultado.rows[0];

        const respostaFormatada = {
            id: pedidoBanco.id,
            cliente,
            produto,
            quantidade: pedidoBanco.quantidade,
            total: pedidoBanco.total
        }

        res.status(201).json(respostaFormatada);
    } catch (erro) {
        if(erro.response?.status === 404){
            const veioDeClientes = erro.config?.url?.includes("/clientes/");
            return res.status(400).json({
                erro: veioDeClientes ? "Cliente não encontrado" : "Produto não encontrado"
            });
        }

        if(erro.code === "ECONNREFUSED" || erro.code === "ECONNABORTED"){
            return res.status(503).json({
                erro: "Serviço de Produtos ou de Clientes indisponível"
            });
        }

        return res.status(500).json({
            erro: "Erro ao criar pedido"
        });
    }
});


/*app.get("/pedidos/:id", (req, res) => {
    const pedido = pedidos.find(
        p => p.id === Number(req.params.id)
    );

    if (!pedido) {
        return res.status(404).json({
            erro: "Pedido não encontrado"
        });
    }

    res.json(pedido);
});*/

app.get("/pedidos/:id", async (req, res) => {
    try {
        const resultado = await db.query(
            "SELECT * FROM pedidos WHERE id = $1",
            [req.params.id]
        );

        const pedido = resultado.rows[0];

        if (!pedido) {
            return res.status(404).json({
                erro: "Pedido não encontrado"
            });
        }

        res.json(pedido);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar pedido"
        });
    }
});

app.use(express.json());

async function criarTabela() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        nome_produto VARCHAR(100) NOT NULL,
        preco_unitario NUMERIC(10, 2) NOT NULL,
        quantidade INTEGER NOT NULL,
        total NUMERIC(10, 2) NOT NULL
        )
    `);

    console.log("Tabela de pedidos pronta");
}

criarTabela();

app.listen(3002, () => {
    console.log("Pedidos rodando na porta 3002");
});