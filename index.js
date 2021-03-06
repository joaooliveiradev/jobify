const express = require('express');
const app = express();
const sqlite = require('sqlite');


const path = require('path');


/* usando express.json() no lugar de body-parser pois ja está incluso na biblioteca e é mais recomendado

middleware são metódos/funções que são chamados entre o processamento do request e o retorno da response em seu "application method".

vc precisa dele necessariamente quando é uma requisiçã post ou put porque está mandando dados.
não precisa dele em requisições get ou delete.

basicamente express.json() é o middleware para lidar com os dados que estão vindo no corpo da requisição.

*/

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbConnection = sqlite.open(path.resolve(__dirname, 'banco.sqlite'), { Promise });

//definindo variavel de ambiente, caso não seja possivel definir ele vai escolher 3000.
const port = process.env.PORT || 3000;

app.use('/admin', (req, res, next) => {
    /*req.hostname retorna o nome do servidor, exemplo, localhost:3000, req.hostname vai voltar localhost
    aqui estamos verificando se hostname === localhost porque só vamos dar next() para ele continuar a aplicação
    quando estiver rodando na nossa maquina, ou seja, localhost, isso serve como segurança para outros usuarios
    não entrarem e fazerem mudança em nossa aplicação, será que é uma gambiarra? não sei. 
    */ 
    if (req.hostname === "localhost") {
        next();
    } else {
        res.send('Not allowed');
    }
});


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); //seta parametros para olhar na pasta view, e procurar arquivos .ejs

app.use(express.static(path.join(__dirname, 'public')));



/*apos receber uma chamada no '/' da porta 3000 o app pega com o .get o request 
e responde o response renderizando a view home  */

app.get('/', async (request, response) => {
    const db = await dbConnection;
    const categoriasDb = await db.all('select * from categorias');
    const vagas = await db.all('select * from vagas');
    const categorias = categoriasDb.map(cat => {
        return {
            ...cat,
            vagas: vagas.filter(vaga => vaga.categoria === cat.id)
        }
    })
    response.render('home', {
        categorias
    });
})



app.get('/admin', (req, res) => {
    res.render('admin/home');
})


/* ============= ROTAS VAGA ================= */

app.get('/admin/vagas', async (req, res) => {
    const db = await dbConnection;
    const vagas = await db.all('select * from vagas');
    res.render('admin/vagas', {
        vagas
    })
});

app.get('/vaga/:id', async (request, response) => {
    const db = await dbConnection;
    const vaga = await db.get('select * from vagas where id = ' + request.params.id);
    response.render('vaga', {
        vaga
    });
});

app.get('/admin/vagas/criarVaga', async (req, res) => {
    const db = await dbConnection;
    const categorias = await db.all('select * from categorias');
    res.render('admin/novaVaga', {
        categorias
    });
});

app.post('/admin/vagas/criarVaga', async (req, res) => {
    const db = await dbConnection;
    const { titulo, descricao, categoria } = req.body;
    await db.run(`insert into vagas(categoria,titulo,descricao) values(${categoria},'${titulo}','${descricao}')`);
    res.redirect('/admin/vagas');// após o insert do db.run usa o metodo redirect do response para redirecionar para outra página
});

app.get('/admin/vagas/delete/:id', async (req, res) => {
    const db = await dbConnection;
    await db.run('delete from vagas where id = ' + req.params.id);
    res.redirect('/admin/vagas');
});

app.get('/admin/vagas/editar/:id', async (req, res) => {
    const db = await dbConnection;
    const vagas = await db.get('select * from vagas where id = ' + req.params.id);
    const categorias = await db.all('select * from categorias');
    res.render('admin/editarVaga', {
        vagas,
        categorias
    })
});

app.post('/admin/vagas/editar/:id', async (req, res) => {
    const db = await dbConnection;
    const { titulo, descricao, categoria } = req.body;
    await db.run(`update vagas set categoria = ${categoria}, titulo = '${titulo}', descricao = '${descricao}' where id = ` + req.params.id);
    res.redirect('/admin/vagas');//após fazer a atualização, redireciona denovo para página anterior.
});

// =========== TERMINA ROTAS VAGA =====================


/* ============= ROTAS CATEGORIA  ================= */

app.get('/admin/categorias', async (req, res) => {
    const db = await dbConnection;
    const categorias = await db.all('select * from categorias');
    res.render('admin/categorias', {
        categorias
    })
});

app.get('/admin/categorias/criarCategoria', async (req, res) => res.render('admin/novaCategoria'));

app.post('/admin/categorias/criarCategoria', async (req, res) => {
    const nome = req.body.nome;
    const db = await dbConnection;
    await db.run(`insert into categorias(categoria) values ('${nome}')`);
    res.redirect('/admin/categorias');
});

app.get('/admin/categorias/deletarCategoria/:id', async (req, res) => {
    const db = await dbConnection;
    await db.run('delete from categorias where id = ' + req.params.id);
    res.redirect('/admin/categorias');
});

app.get('/admin/categorias/editarCategoria/:id', async (req, res) => {
    const db = await dbConnection;
    const categorias = await db.get('select * from categorias where id = ' + req.params.id);
    res.render('admin/editarCategoria', {
        categorias
    })
});

app.post('/admin/categorias/editarCategoria/:id', async (req, res) => {
    const nome = req.body.nome;
    const db = await dbConnection;
    await db.run(`UPDATE categorias set categoria = '${nome}' where id = ` + req.params.id);
    res.redirect('/admin/categorias');
});



/* ============= TERMINA ROTAS CATEGORIA  ================= */


const init = async () => {
    const db = await dbConnection;
    await db.run('create table if not exists categorias (id INTEGER PRIMARY KEY, categoria TEXT)');
    await db.run('create table if not exists vagas (id INTEGER PRIMARY KEY, categoria INTEGER, titulo TEXT, descricao TEXT)');
    // const categoria = 'Marketing Team';
    // await db.run(`insert into categorias(categoria) values ('${categoria}')`);
    // const vaga = 'Social Media (São Francisco)';
    // const descricao = 'Vaga para Social Media em São Francisco';
    // await db.run(`insert into vagas(categoria, titulo, descricao) values (2,'${vaga}','${descricao}')`);

}

init();

app.listen(port, (err) => {
    if (err) {
        console.log('Não foi possível iniciar o servidor.');
    } else {
        console.log('Servidor do Jobify Iniciado!',);
    }
});